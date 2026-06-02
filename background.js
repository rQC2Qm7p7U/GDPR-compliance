// Load modules (rules-updater for updates, and segmented bg modules)
try { importScripts('rules-updater.js'); } catch(e) { console.warn('[GDPR Audit] rules-updater.js not loaded:', e); }

// Global variables shared with imported modules
let trackers = [];
let userCountryCode = null;

// Import all background sub-modules
importScripts('bg-geo.js', 'bg-trackers.js', 'bg-state.js', 'bg-cookie-audit.js', 'bg-policy-scanner.js');

// Auto-run user location checker on startup
checkUserLocation();

// Load the tracker rules database on startup
loadTrackers();

// ─── On install / update: fetch fresh rules immediately ──────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[GDPR Audit] Extension installed/updated. Fetching initial online rules...');
  if (typeof fetchAndCacheRules === 'function') {
    await fetchAndCacheRules(true); // force refresh on install
    await loadTrackers(); // reload trackers with fresh online data
  }
  if (typeof scheduleRulesRefresh === 'function') {
    scheduleRulesRefresh();
  }
});

// ─── On startup: schedule refresh alarm and reload trackers ──────────────
chrome.runtime.onStartup.addListener(async () => {
  if (typeof scheduleRulesRefresh === 'function') scheduleRulesRefresh();
  if (typeof fetchAndCacheRules === 'function') {
    const result = await fetchAndCacheRules(false); // only if stale
    if (result.status === 'updated' || result.status === 'partial') {
      await loadTrackers(); // reload with fresh data if we got new rules
    }
  }
});

// Configure side panel to open on action click
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error('[GDPR Audit] Failed to set side panel behavior:', err));
}

// ─── Intercept network requests ───────────────────────────────────────────
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Handle processing asynchronously to avoid blocking the main thread
    processRequest(details);
  },
  { urls: ["<all_urls>"] }
);

async function processRequest(details) {
  const { tabId, url, initiator, type, requestId } = details;
  
  // Ignore background/extension requests
  if (tabId < 0) return;

  // Reset tab state when navigating to a new page (main_frame request)
  if (type === 'main_frame') {
    let auditMode = 'auto';
    try {
      const storageData = await chrome.storage.local.get('globalAuditMode');
      auditMode = storageData.globalAuditMode || 'auto';
    } catch (e) {
      console.error('Failed to read audit mode:', e);
    }

    const freshState = createDefaultState(url, auditMode);
    await saveTabState(tabId, freshState);
    
    // Clear badge count
    try {
      await chrome.action.setBadgeText({ tabId, text: '' });
    } catch (e) {
      // Ignored: tab might have closed quickly or is not ready
    }
    return;
  }

  // Check if the request is to a tracker domain
  const trackerName = matchTracker(url);
  if (!trackerName) return;

  // Retrieve current tab audit state
  const state = await getTabState(tabId, url);

  // If consent is already established as accepted, ignore tracker requests
  if (state.consentStatus === 'accepted') return;

  const auditMode = state.auditMode || 'auto';
  const isStrictGdprBypass = (state.consentStatus === 'not_applicable' && state.jurisdiction === 'GDPR' && auditMode === 'gdpr');
  const isStrictZzplBypass = (state.consentStatus === 'not_applicable' && state.jurisdiction === 'ZZPL');
  const isStrictCcpaBypass = (state.consentStatus === 'not_applicable' && state.jurisdiction === 'CCPA' && auditMode === 'ccpa');

  // If consent is established as not_applicable but no strict overrides are active, ignore
  if (state.consentStatus === 'not_applicable' && !isStrictGdprBypass && !isStrictZzplBypass && !isStrictCcpaBypass) return;

  // Detect violations
  let violationType = null;
  if (state.consentStatus === 'unknown') {
    violationType = 'PRE_CONSENT';
  } else if (state.consentStatus === 'rejected') {
    violationType = 'POST_REJECTION';
  } else if (isStrictGdprBypass) {
    violationType = 'GDPR_BYPASS';
  } else if (isStrictZzplBypass) {
    violationType = 'ZZPL_BYPASS';
  } else if (isStrictCcpaBypass) {
    violationType = 'CCPA_BYPASS';
  }

  if (violationType) {
    // Avoid logging duplicates of the same network request (e.g. on redirects)
    if (state.violations.some(v => v.requestId === requestId)) return;

    const violation = {
      type: violationType,
      url,
      trackerName,
      timestamp: Date.now(),
      initiator: initiator || 'Unknown',
      requestId
    };

    state.violations.push(violation);
    await saveTabState(tabId, state);

    // Update extension badge count
    updateBadge(tabId, state.violations.length);
  }
}

// Reset tab state on navigation/reload, and audit cookies on complete
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    clearTabState(tabId);
    const key = `tab_${tabId}`;
    chrome.storage.session.remove(key).catch(() => {});
  }
  if (changeInfo.status === 'complete' && tab.url) {
    auditCookies(tabId, tab.url);
  }
});

// Clean up stored session states when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  clearTabState(tabId);
  const key = `tab_${tabId}`;
  await chrome.storage.session.remove(key);
});

// Helper for security audit: validate and sanitize incoming URL strings
function isValidUrl(str) {
  if (!str || typeof str !== 'string' || str.length > 2048) return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return str.startsWith('/') || str.startsWith('./') || str.startsWith('../');
  }
}

// Helper for security audit: sanitize strings to prevent injections
function sanitizeString(str, maxLength = 256) {
  if (typeof str !== 'string') return '';
  let cleaned = str.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  return cleaned;
}

// ─── Listen for CMP and DOM scraper messages ──────────────────────────────
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'CMP_STATUS_CHANGE') {
    const tabId = sender.tab && sender.tab.id;
    const tabUrl = sender.tab && sender.tab.url;
    
    // Strict whitelist verification for consent status
    const validStatuses = ['unknown', 'accepted', 'rejected', 'not_applicable'];
    const status = sanitizeString(message.status, 50);
    const source = sanitizeString(message.source, 100);
    const eventStatus = sanitizeString(message.eventStatus, 100);
    
    if (tabId && validStatuses.includes(status)) {
      handleConsentUpdate(tabId, status, source, tabUrl || '', eventStatus);
    }
  } else if (message.type === 'DOM_SCRAPE_RESULTS') {
    const tabId = sender.tab && sender.tab.id;
    const tabUrl = sender.tab && sender.tab.url;
    if (!tabId) return;

    // Validate and sanitize DOM scraping payloads
    const sanitizedData = {
      isTopFrame: message.isTopFrame === true,
      privacyPolicyLink: (message.privacyPolicyLink && isValidUrl(message.privacyPolicyLink)) ? message.privacyPolicyLink : null,
      lang: sanitizeString(message.lang, 10),
      policyInFooter: message.policyInFooter === true,
      preCheckedCheckboxes: (message.preCheckedCheckboxes === true || message.preCheckedCheckboxes === 'no_checkboxes' || message.preCheckedCheckboxes === 'no_forms') ? message.preCheckedCheckboxes : 'no_forms',
      hasFormPolicyLink: (message.hasFormPolicyLink === true || message.hasFormPolicyLink === 'no_forms') ? message.hasFormPolicyLink : 'no_forms',
      cmpRejectStatus: ['detected', 'missing', 'unequal', 'no_cmp'].includes(message.cmpRejectStatus) ? message.cmpRejectStatus : 'no_cmp',
      cmpPolicyLinkDetected: (message.cmpPolicyLinkDetected === true || message.cmpPolicyLinkDetected === 'no_cmp') ? message.cmpPolicyLinkDetected : 'no_cmp',
      dataMinimizationStatus: ['passed', 'failed', 'warning', 'no_forms'].includes(message.dataMinimizationStatus) ? message.dataMinimizationStatus : 'no_forms',
      policyDeepScan: message.policyDeepScan && typeof message.policyDeepScan === 'object' ? {
        hasDpo: message.policyDeepScan.hasDpo === true,
        hasTransparency: message.policyDeepScan.hasTransparency === true,
        hasRights: message.policyDeepScan.hasRights === true,
        isPlainLanguage: message.policyDeepScan.isPlainLanguage === true
      } : null
    };

    handleDomScrape(tabId, sanitizedData, tabUrl || '');
  } else if (message.type === 'LEARNED_SIGNATURE') {
    const { signature } = message;
    if (signature && signature.domain && signature.key && typeof signature.key === 'string' && signature.key.trim().length >= 2) {
      const sanitizedSig = {
        domain: sanitizeString(signature.domain, 256),
        key: sanitizeString(signature.key, 256),
        storageType: sanitizeString(signature.storageType, 50),
        action: sanitizeString(signature.action, 50),
        valPattern: sanitizeString(signature.valPattern, 1024)
      };

      const storageKey = `learned_signatures_${sanitizedSig.domain}`;
      chrome.storage.local.get(storageKey, (res) => {
        let signatures = res[storageKey] || [];
        if (!signatures.some(sig => sig.key === sanitizedSig.key && sig.storageType === sanitizedSig.storageType)) {
          signatures.push(sanitizedSig);
          if (signatures.length > 5) {
            signatures = signatures.slice(signatures.length - 5);
          }
          
          chrome.storage.local.set({ [storageKey]: signatures }, () => {
            console.log(`[GDPR Audit] Storage signature learned and persisted (capped at 5) for ${sanitizedSig.domain}:`, sanitizedSig);
          });
        }
      });
    }
  } else if (message.type === 'SCAN_POLICY_URL') {
    const tabId = sender.tab && sender.tab.id;
    const url = sanitizeString(message.url, 2048);
    if (tabId && isValidUrl(url)) {
      runBackgroundPolicyScan(tabId, url);
    }
  }
});

async function handleDomScrape(tabId, scrapeData, tabUrl) {
  const state = await getTabState(tabId, tabUrl);

  const isTopFrame = scrapeData.isTopFrame !== false;

  if (isTopFrame) {
    if (scrapeData.privacyPolicyLink) {
      state.privacyPolicyLink = scrapeData.privacyPolicyLink;
    }
    if (scrapeData.lang) {
      state.lang = scrapeData.lang;
    }
    if (scrapeData.policyInFooter) {
      state.policyInFooter = scrapeData.policyInFooter;
    }
    if (scrapeData.preCheckedCheckboxes) {
      state.preCheckedCheckboxes = scrapeData.preCheckedCheckboxes;
    }
    if (scrapeData.hasFormPolicyLink) {
      state.hasFormPolicyLink = scrapeData.hasFormPolicyLink;
    }
    if (scrapeData.policyDeepScan) {
      state.policyDeepScan = scrapeData.policyDeepScan;
    }
    if (scrapeData.dataMinimizationStatus) {
      state.dataMinimizationStatus = scrapeData.dataMinimizationStatus;
    }
    if (scrapeData.cmpRejectStatus !== 'no_cmp' || state.cmpRejectStatus === 'no_cmp') {
      state.cmpRejectStatus = scrapeData.cmpRejectStatus;
    }
    if (scrapeData.cmpPolicyLinkDetected !== undefined) {
      if (scrapeData.cmpPolicyLinkDetected === true || state.cmpPolicyLinkDetected === 'no_cmp') {
        state.cmpPolicyLinkDetected = scrapeData.cmpPolicyLinkDetected;
      }
    }
  } else {
    if (scrapeData.cmpRejectStatus !== 'no_cmp') {
      state.cmpRejectStatus = scrapeData.cmpRejectStatus;
    }
    if (scrapeData.cmpPolicyLinkDetected !== undefined) {
      if (scrapeData.cmpPolicyLinkDetected === true || state.cmpPolicyLinkDetected === 'no_cmp') {
        state.cmpPolicyLinkDetected = scrapeData.cmpPolicyLinkDetected;
      }
    }
  }

  // Resolve jurisdiction and store
  const auditMode = state.auditMode || 'auto';
  const detectedJur = resolveJurisdiction(tabUrl, scrapeData.lang, auditMode);
  if (detectedJur) {
    state.jurisdiction = detectedJur;
  } else if (!state.jurisdiction && state.source) {
    state.jurisdiction = state.source === 'USPAPI' ? 'CCPA' : 'GDPR';
  }

  // Re-classify early violations based on updated jurisdiction & auditMode
  if (state.consentStatus === 'not_applicable' && state.violations.length > 0) {
    let updated = false;
    state.violations = state.violations.map(v => {
      if (v.type === 'PRE_CONSENT') {
        if (state.jurisdiction === 'ZZPL') {
          v.type = 'ZZPL_BYPASS';
          updated = true;
        } else if (state.jurisdiction === 'GDPR' && auditMode === 'gdpr') {
          v.type = 'GDPR_BYPASS';
          updated = true;
        } else if (state.jurisdiction === 'CCPA' && auditMode === 'ccpa') {
          v.type = 'CCPA_BYPASS';
          updated = true;
        }
      }
      return v;
    });
    if (updated) {
      await updateBadge(tabId, state.violations.length);
    }
  }

  await saveTabState(tabId, state);
}

async function handleConsentUpdate(tabId, status, source, tabUrl, eventStatus) {
  const state = await getTabState(tabId, tabUrl);

  // Universal rule: If the consent is already established (accepted/rejected), 
  // do not allow it to revert to 'unknown' unless the CMP banner is actually shown again (cmpuishown)
  if (state.consentStatus !== 'unknown' && status === 'unknown' && eventStatus !== 'cmpuishown') {
    console.log(`[GDPR Audit] Ignored status revert to 'unknown' from ${source} (event: ${eventStatus}) while consent is ${state.consentStatus}`);
    return;
  }

  const statusChanged = state.consentStatus !== status || state.source !== source;

  if (statusChanged) {
    state.consentStatus = status;
    state.source = source;

    const auditMode = state.auditMode || 'auto';
    // Resolve jurisdiction early if it is GDPR/CCPA based on standard
    if (!state.jurisdiction) {
      const detectedJur = resolveJurisdiction(tabUrl, state.lang, auditMode);
      state.jurisdiction = detectedJur || (source === 'USPAPI' ? 'CCPA' : 'GDPR');
    }

    // Compliance logic resolver:
    if (status === 'not_applicable') {
      const isStrictGdprBypass = (state.jurisdiction === 'GDPR' && auditMode === 'gdpr');
      const isStrictZzplBypass = (state.jurisdiction === 'ZZPL');
      const isStrictCcpaBypass = (state.jurisdiction === 'CCPA' && auditMode === 'ccpa');

      if (isStrictGdprBypass || isStrictZzplBypass || isStrictCcpaBypass) {
        // Enforce: Strict mode is active, so TCF's "not_applicable" is a consent bypass for trackers
        state.violations = state.violations.map(v => {
          if (v.type === 'PRE_CONSENT') {
            v.type = isStrictGdprBypass ? 'GDPR_BYPASS' : (isStrictZzplBypass ? 'ZZPL_BYPASS' : 'CCPA_BYPASS');
          }
          return v;
        });
        console.log(`[GDPR Audit] Tab ${tabId}: CMP reported N/A, but Strict ${state.jurisdiction} applies. Re-classified violations.`);
      } else {
        // General: Clear violations
        state.violations = [];
        await updateBadge(tabId, 0);
        console.log(`[GDPR Audit] Tab ${tabId}: Consent not applicable. Cleared early logs.`);
      }
    } else if (status === 'accepted') {
      // If pre-existing consent, clear false-positives
      if (eventStatus === 'tcloaded') {
        state.violations = [];
        await updateBadge(tabId, 0);
        console.log(`[GDPR Audit] Tab ${tabId}: Pre-existing consent loaded. Cleared early logs.`);
      } else if (eventStatus === 'useractioncomplete') {
        // User just clicked Accept. Filter out any race-condition violations that occurred within 1 second of this update
        const now = Date.now();
        const initialCount = state.violations.length;
        state.violations = state.violations.filter(v => {
          // Keep the violation if it happened more than 1 second before the accept choice
          const isRaceCondition = v.type === 'PRE_CONSENT' && (now - v.timestamp < 1000);
          return !isRaceCondition;
        });
        if (state.violations.length !== initialCount) {
          await updateBadge(tabId, state.violations.length);
          console.log(`[GDPR Audit] Tab ${tabId}: Filtered out ${initialCount - state.violations.length} race-condition violations on Accept.`);
        }
      }
    } else if (status === 'rejected') {
      // If pre-existing rejection, map to POST_REJECTION
      if (eventStatus === 'tcloaded') {
        state.violations = state.violations.map(v => {
          v.type = 'POST_REJECTION';
          return v;
        });
        console.log(`[GDPR Audit] Tab ${tabId}: Pre-existing rejection loaded. Violations updated.`);
      }
      
      // Audit cookies for the domain
      if (tabUrl) {
        setTimeout(() => auditCookies(tabId, tabUrl), 500);
      }
    }

    await saveTabState(tabId, state);
    console.log(`[GDPR Audit] Tab ${tabId} updated: Status = ${status}, Source = ${source}, Event = ${eventStatus}`);
  }
}

// ─── Handle popup requests for rules management ───────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORCE_RULES_UPDATE') {
    // Popup "Update Now" button — force-refresh all online rules
    if (typeof fetchAndCacheRules === 'function') {
      fetchAndCacheRules(true).then(async (result) => {
        if (result.status === 'updated' || result.status === 'partial') {
          await loadTrackers();
        }
        sendResponse(result);
      }).catch(err => sendResponse({ status: 'failed', error: err.message }));
    } else {
      sendResponse({ status: 'failed', error: 'Rules updater not loaded' });
    }
    return true; // Keep message channel open for async response

  } else if (message.type === 'GET_RULES_STATUS') {
    // Popup status request — return metadata about cached rules
    chrome.storage.local.get(['rules_updated_at', 'cmp_selectors_remote', 'tracker_rules_remote'], (data) => {
      sendResponse({
        updatedAt: data.rules_updated_at || null,
        cmpCount: data.cmp_selectors_remote ? data.cmp_selectors_remote.length : 0,
        trackerCount: data.tracker_rules_remote ? data.tracker_rules_remote.length : 0
      });
    });
    return true;
  }
});
