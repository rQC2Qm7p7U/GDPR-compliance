// Load the online rules updater module (fetches CMP selectors & trackers from GitHub)
try { importScripts('rules-updater.js'); } catch(e) { console.warn('[GDPR Audit] rules-updater.js not loaded:', e); }

let trackers = [];
let userCountryCode = null;

// Geolocation query to determine user country code (runs on service worker startup)
async function checkUserLocation() {
  // 1. First inspect browser language settings for quick regional hints
  try {
    const langs = await new Promise((resolve) => {
      if (chrome.i18n && typeof chrome.i18n.getAcceptLanguages === 'function') {
        chrome.i18n.getAcceptLanguages((languages) => resolve(languages || []));
      } else {
        resolve(navigator.languages || []);
      }
    });

    for (const lang of langs) {
      const cleanLang = lang.toLowerCase();
      if (cleanLang === 'me' || cleanLang.endsWith('-me') || cleanLang.includes('sr-') || cleanLang.includes('hr-') || cleanLang.includes('bs-')) {
        userCountryCode = 'ME';
        console.log('[GDPR Audit] Location heuristically set to ME from browser languages:', lang);
        return;
      }
    }
  } catch (e) {
    console.warn('[GDPR Audit] Language accept-header check failed:', e);
  }

  // 2. Fallback to API check with a strict timeout to avoid freezing startup
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    userCountryCode = data.countryCode;
    console.log('[GDPR Audit] User location resolved via API:', userCountryCode);
  } catch (err) {
    console.warn('[GDPR Audit] Location API query failed/timed out, defaulting to null:', err.message);
  }
}

checkUserLocation();

// Popular tracking cookies mapping — covers 70+ known tracker cookie patterns
const TRACKER_COOKIES = {
  // Google Analytics / Tag Manager
  '_ga': 'Google Analytics',
  '_gid': 'Google Analytics',
  '_gat': 'Google Analytics',
  '_gac': 'Google Analytics',
  '_ga_': 'Google Analytics (GA4)',
  '_gcl_au': 'Google Ads Conversion',
  '_gcl_aw': 'Google Ads Conversion',
  '_gcl_dc': 'Google Ads Conversion',
  '__utma': 'Google Analytics (Legacy)',
  '__utmb': 'Google Analytics (Legacy)',
  '__utmc': 'Google Analytics (Legacy)',
  '__utmz': 'Google Analytics (Legacy)',
  '__utmt': 'Google Analytics (Legacy)',
  // Google Ads / DoubleClick
  'IDE': 'Google Ads/DoubleClick',
  'DSID': 'Google Ads/DoubleClick',
  'FLC': 'Google Ads/DoubleClick',
  'AID': 'Google Ads',
  'TAID': 'Google Ads',
  'NID': 'Google (Preferences)',
  'ANID': 'Google Ads',
  '1P_JAR': 'Google Ads',
  // Facebook / Meta
  '_fbp': 'Facebook/Meta Pixel',
  '_fbc': 'Facebook/Meta Pixel',
  'fr': 'Facebook',
  'datr': 'Facebook',
  'sb': 'Facebook',
  'wd': 'Facebook',
  // TikTok
  '_ttp': 'TikTok Pixel',
  '_tt_enable_cookie': 'TikTok Pixel',
  'tt_pixel_session_index': 'TikTok Pixel',
  // Hotjar
  '_hjSession': 'Hotjar',
  '_hjSessionUser': 'Hotjar',
  '_hjAbsoluteSessionInProgress': 'Hotjar',
  '_hjFirstSeen': 'Hotjar',
  '_hjIncludedInPageviewSample': 'Hotjar',
  '_hjIncludedInSessionSample': 'Hotjar',
  '_hjTLDTest': 'Hotjar',
  // Microsoft Clarity
  '_clck': 'Microsoft Clarity',
  '_clsk': 'Microsoft Clarity',
  'MUID': 'Microsoft Ads',
  'MUIDB': 'Microsoft Ads',
  // Bing / Microsoft
  '_uetsid': 'Microsoft Bing Ads',
  '_uetvid': 'Microsoft Bing Ads',
  'MR': 'Microsoft',
  'MSPTC': 'Microsoft',
  // HubSpot
  '__hstc': 'HubSpot',
  'hubspotutk': 'HubSpot',
  '__hssc': 'HubSpot',
  '__hssrc': 'HubSpot',
  '__hs_opt_out': 'HubSpot',
  'hs-messages-is-open': 'HubSpot',
  // LinkedIn
  'li_gc': 'LinkedIn',
  'li_sugr': 'LinkedIn',
  'lidc': 'LinkedIn',
  'bcookie': 'LinkedIn',
  'AnalyticsSyncHistory': 'LinkedIn',
  'UserMatchHistory': 'LinkedIn',
  // Twitter / X
  '_twitter_sess': 'Twitter/X',
  'personalization_id': 'Twitter/X',
  'guest_id': 'Twitter/X',
  'ct0': 'Twitter/X',
  // Pinterest
  '_pinterest_sess': 'Pinterest',
  '_pinterest_ct_ua': 'Pinterest',
  '_pin_unauth': 'Pinterest',
  // Yandex Metrica
  '_ym_uid': 'Yandex Metrica',
  '_ym_d': 'Yandex Metrica',
  '_ym_isad': 'Yandex Metrica',
  '_ym_visorc': 'Yandex Metrica',
  // Adobe Analytics
  's_cc': 'Adobe Analytics',
  's_sq': 'Adobe Analytics',
  's_vi': 'Adobe Analytics',
  's_fid': 'Adobe Analytics',
  'AMCV_': 'Adobe Marketing Cloud',
  'AMCVS_': 'Adobe Marketing Cloud',
  'demdex': 'Adobe Audience Manager',
  'dextp': 'Adobe Audience Manager',
  // Criteo
  'uid': 'Criteo',
  'udc': 'Criteo',
  'cto_bundle': 'Criteo',
  'cto_lwid': 'Criteo',
  // Quantcast
  '__qca': 'Quantcast',
  '__qcs': 'Quantcast',
  // Amplitude
  'amplitude_id': 'Amplitude',
  'amplitude_unsent': 'Amplitude',
  // Segment
  'ajs_user_id': 'Segment',
  'ajs_anonymous_id': 'Segment',
  'ajs_group_id': 'Segment',
  // Intercom
  'intercom-id-': 'Intercom',
  'intercom-session-': 'Intercom',
  'intercom-device-id-': 'Intercom',
  // Braze
  'ab.storage.userId': 'Braze',
  'ab.storage.deviceId': 'Braze',
  // Mixpanel
  'mp_': 'Mixpanel',
  // Heap Analytics
  '_hp2_id': 'Heap Analytics',
  '_hp2_ses_props': 'Heap Analytics',
  // FullStory
  'fs_uid': 'FullStory',
  // Optimizely
  'optimizelyEndUserId': 'Optimizely',
  'optimizelyRedirectData': 'Optimizely',
  // VWO
  '_vwo_uuid': 'VWO',
  '_vwo_ds': 'VWO',
  '_vwo_sn': 'VWO',
  // AB Tasty
  'ABTasty': 'AB Tasty',
  // Outbrain
  'obuid': 'Outbrain',
  // Taboola
  't_gid': 'Taboola',
  'taboola_session_id': 'Taboola',
  // Salesforce
  'sfmc_id': 'Salesforce Marketing Cloud',
  // Klaviyo
  '__kla_id': 'Klaviyo',
  // Parse.ly
  '_parsely_session': 'Parse.ly',
  '_parsely_visitor': 'Parse.ly',
  // Nielsen
  'imrworldwide': 'Nielsen',
  // Snap / Snapchat
  '_scid': 'Snapchat Pixel',
  '_sctr': 'Snapchat Pixel',
  // Reddit
  'rdt_uuid': 'Reddit Pixel',
  // Chartbeat
  '_chartbeat2': 'Chartbeat',
  '_chartbeat4': 'Chartbeat'
};

// Load tracker patterns: merges bundled trackers.json with online DuckDuckGo rules
async function loadTrackers() {
  try {
    // 1. Load bundled static trackers.json
    const url = chrome.runtime.getURL('trackers.json');
    const response = await fetch(url);
    const bundled = await response.json();
    trackers = [...bundled];
    console.log('[GDPR Audit] Bundled tracker database loaded:', trackers.length, 'trackers.');

    // 2. Merge with online DuckDuckGo rules from cache (if available)
    const cached = await chrome.storage.local.get('tracker_rules_remote');
    if (cached.tracker_rules_remote && Array.isArray(cached.tracker_rules_remote)) {
      const remote = cached.tracker_rules_remote;
      // Merge: avoid duplicates by owner name
      const existingNames = new Set(trackers.map(t => t.name.toLowerCase()));
      let added = 0;
      for (const remoteTracker of remote) {
        if (!existingNames.has(remoteTracker.name.toLowerCase())) {
          trackers.push(remoteTracker);
          existingNames.add(remoteTracker.name.toLowerCase());
          added++;
        }
      }
      console.log(`[GDPR Audit] Merged ${added} additional trackers from DuckDuckGo online rules. Total: ${trackers.length}`);
    }
  } catch (err) {
    console.error('[GDPR Audit] Failed to load trackers database:', err);
  }
}

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

// Helper to check if a URL belongs to a known tracker system
function matchTracker(urlStr) {
  try {
    const url = new URL(urlStr);
    const hostAndPath = url.hostname + url.pathname;
    for (const tracker of trackers) {
      for (const pattern of tracker.patterns) {
        if (hostAndPath.includes(pattern) || urlStr.includes(pattern)) {
          return tracker.name;
        }
      }
    }
  } catch (e) {
    // If URL parsing fails, fall back to simple substring match
    for (const tracker of trackers) {
      for (const pattern of tracker.patterns) {
        if (urlStr.includes(pattern)) {
          return tracker.name;
        }
      }
    }
  }
  return null;
}

// Helper to determine if ZZPL (Montenegrin Law) applies based on URL, language, and user IP location
function resolveJurisdiction(urlStr, lang, auditMode) {
  if (auditMode === 'gdpr') return 'GDPR';
  if (auditMode === 'ccpa') return 'CCPA';
  if (auditMode === 'zzpl') return 'ZZPL';

  try {
    const url = new URL(urlStr);
    // Explicit Montenegro TLD or user is physically in Montenegro
    if (url.hostname.endsWith('.me') || userCountryCode === 'ME') {
      return 'ZZPL';
    }
    // Language check for Montenegrin / Serbian / Croatian / Bosnian
    if (lang) {
      const bcsLangs = ['me', 'sr', 'bs', 'hr'];
      const cleanLang = lang.toLowerCase().split('-')[0];
      if (bcsLangs.includes(cleanLang)) {
        return 'ZZPL';
      }
    }
  } catch (e) {}
  return null;
}

const tabStates = new Map();
const loadingPromises = new Map();

function createDefaultState(url = '', auditMode = 'auto') {
  return {
    consentStatus: 'unknown',
    source: null,
    violations: [],
    isHttps: url ? url.startsWith('https:') : false,
    privacyPolicyLink: null,
    jurisdiction: resolveJurisdiction(url, null, auditMode),
    lang: null,
    userCountry: userCountryCode,
    auditMode: auditMode,
    policyInFooter: false,
    preCheckedCheckboxes: false,
    hasFormPolicyLink: false,
    cmpRejectStatus: 'no_cmp',
    policyDeepScan: null
  };
}

async function getTabState(tabId, fallbackUrl = '') {
  if (tabStates.has(tabId)) {
    return tabStates.get(tabId);
  }
  if (loadingPromises.has(tabId)) {
    return loadingPromises.get(tabId);
  }

  const key = `tab_${tabId}`;
  const promise = chrome.storage.session.get(key).then(async (data) => {
    let state = data[key];
    if (!state) {
      let auditMode = 'auto';
      try {
        const storageData = await chrome.storage.local.get('globalAuditMode');
        auditMode = storageData.globalAuditMode || 'auto';
      } catch (e) {
        console.error('Failed to read audit mode:', e);
      }
      state = createDefaultState(fallbackUrl, auditMode);
    }
    tabStates.set(tabId, state);
    loadingPromises.delete(tabId);
    return state;
  });

  loadingPromises.set(tabId, promise);
  return promise;
}

async function saveTabState(tabId, state) {
  tabStates.set(tabId, state);
  const key = `tab_${tabId}`;
  try {
    await chrome.storage.session.set({ [key]: state });
  } catch (e) {
    console.error(`[GDPR Audit] Failed to save state for tab ${tabId}:`, e);
  }
}

function clearTabState(tabId) {
  tabStates.delete(tabId);
  loadingPromises.delete(tabId);
}

// Intercept network requests
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

// Audit cookies on tab load complete
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    auditCookies(tabId, tab.url);
  }
});

// Cookie auditor
async function auditCookies(tabId, urlStr) {
  if (tabId < 0) return;
  
  let hostname = '';
  try {
    const url = new URL(urlStr);
    if (url.protocol.startsWith('chrome') || url.protocol === 'about:') return;
    hostname = url.hostname;
  } catch (e) {
    return;
  }

  try {
    const state = await getTabState(tabId, urlStr);

    // If consent is already established as accepted, ignore cookie scanning
    if (state.consentStatus === 'accepted') return;

    const auditMode = state.auditMode || 'auto';
    const isStrictGdprBypass = (state.consentStatus === 'not_applicable' && state.jurisdiction === 'GDPR' && auditMode === 'gdpr');
    const isStrictZzplBypass = (state.consentStatus === 'not_applicable' && state.jurisdiction === 'ZZPL');
    const isStrictCcpaBypass = (state.consentStatus === 'not_applicable' && state.jurisdiction === 'CCPA' && auditMode === 'ccpa');

    // If consent is established as not_applicable but no strict overrides are active, ignore
    if (state.consentStatus === 'not_applicable' && !isStrictGdprBypass && !isStrictZzplBypass && !isStrictCcpaBypass) return;

    // Get all cookies for the current domain
    const cookies = await chrome.cookies.getAll({ domain: hostname });
    if (!cookies || cookies.length === 0) return;

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

    if (!violationType) return;

    let stateUpdated = false;

    for (const cookie of cookies) {
      let matchedTracker = null;
      for (const [cookiePattern, trackerName] of Object.entries(TRACKER_COOKIES)) {
        if (cookie.name === cookiePattern || cookie.name.startsWith(cookiePattern + '_') || cookie.name.includes(cookiePattern)) {
          matchedTracker = trackerName;
          break;
        }
      }

      if (matchedTracker) {
        // Construct a unique id to prevent duplicating the same cookie violation
        const cookieViolationId = `cookie_${cookie.name}_${cookie.domain}`;
        if (state.violations.some(v => v.requestId === cookieViolationId)) continue;

        const violation = {
          type: violationType,
          url: `Cookie: ${cookie.name} (domain: ${cookie.domain}, path: ${cookie.path})`,
          trackerName: `${matchedTracker} (Cookie)`,
          timestamp: Date.now(),
          initiator: 'Cookie Storage',
          requestId: cookieViolationId
        };

        state.violations.push(violation);
        stateUpdated = true;
      }
    }

    if (stateUpdated) {
      await saveTabState(tabId, state);
      updateBadge(tabId, state.violations.length);
    }
  } catch (err) {
    console.error('[GDPR Audit] Error auditing cookies:', err);
  }
}

// Update badge display helper
async function updateBadge(tabId, count) {
  try {
    await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' });
    if (count > 0) {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF3B30' });
    }
  } catch (e) {
    // Tab might have closed or not ready
  }
}

// Listen for CMP and DOM scraper messages
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'CMP_STATUS_CHANGE') {
    const tabId = sender.tab && sender.tab.id;
    if (tabId) {
      handleConsentUpdate(tabId, message.status, message.source, sender.tab.url, message.eventStatus);
    }
  } else if (message.type === 'DOM_SCRAPE_RESULTS') {
    const tabId = sender.tab && sender.tab.id;
    if (tabId) {
      handleDomScrape(tabId, message, sender.tab.url);
    }
  } else if (message.type === 'LEARNED_SIGNATURE') {
    const { signature } = message;
    if (signature && signature.domain && signature.key && typeof signature.key === 'string' && signature.key.trim().length >= 2) {
      const storageKey = `learned_signatures_${signature.domain}`;
      chrome.storage.local.get(storageKey, (res) => {
        let signatures = res[storageKey] || [];
        // Prevent duplicate signatures for the same key and storage type
        signatures = signatures.filter(s => !(s.key === signature.key && s.storageType === signature.storageType));
        signatures.push(signature);
        
        // Quota check: limit to max 5 signatures per domain (FIFO eviction)
        if (signatures.length > 5) {
          signatures = signatures.slice(signatures.length - 5);
        }
        
        chrome.storage.local.set({ [storageKey]: signatures }, () => {
          console.log(`[GDPR Audit] Storage signature learned and persisted (capped at 5) for ${signature.domain}:`, signature);
        });
      });
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
    if (scrapeData.cmpRejectStatus !== 'no_cmp' || state.cmpRejectStatus === 'no_cmp') {
      state.cmpRejectStatus = scrapeData.cmpRejectStatus;
    }
  } else {
    if (scrapeData.cmpRejectStatus !== 'no_cmp') {
      state.cmpRejectStatus = scrapeData.cmpRejectStatus;
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

// Clean up stored session states when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  clearTabState(tabId);
  const key = `tab_${tabId}`;
  await chrome.storage.session.remove(key);
});

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
