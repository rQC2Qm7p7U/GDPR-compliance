/**
 * GDPR/CCPA Auditor — Online Rules Updater
 *
 * Fetches and caches CMP selectors and tracker patterns from open-source databases:
 *   • Consent-O-Matic (https://github.com/cavi-au/Consent-O-Matic) — MIT License
 *   • DuckDuckGo Tracker Blocklist (https://github.com/duckduckgo/tracker-blocklists) — CC-BY-NC 4.0
 *
 * Rules are cached in chrome.storage.local and refreshed every 7 days.
 * Falls back to bundled rules if fetch fails.
 */

// ─── Sources ──────────────────────────────────────────────────────────────
const RULES_SOURCES = {
  consentOMatic: 'https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/Rules.json',
  ddgTrackers:   'https://raw.githubusercontent.com/duckduckgo/tracker-blocklists/main/web/v6/extension-tds.json'
};

// Refresh interval: 7 days in milliseconds
const RULES_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALARM_NAME = 'gdpr_audit_rules_refresh';

// ─── Consent-O-Matic parser ───────────────────────────────────────────────
/**
 * Parses the Consent-O-Matic Rules.json format.
 * Extracts CSS selectors from each CMP's detectors.presentMatcher.target.selector
 * Returns a flat array of unique CSS selector strings.
 */
function parseConsentOMatic(rulesJson) {
  const selectors = new Set();
  try {
    const rules = typeof rulesJson === 'string' ? JSON.parse(rulesJson) : rulesJson;
    for (const [cmpName, cmpData] of Object.entries(rules)) {
      if (!cmpData || !Array.isArray(cmpData.detectors)) continue;
      for (const detector of cmpData.detectors) {
        // presentMatcher — selector used to detect if CMP is present on the page
        const pm = detector.presentMatcher;
        if (pm && pm.type === 'css' && pm.target && pm.target.selector) {
          selectors.add(pm.target.selector);
        }
        // showingMatcher — selector used to detect if the CMP banner is visible
        const sm = detector.showingMatcher;
        if (sm && sm.type === 'css' && sm.target && sm.target.selector) {
          selectors.add(sm.target.selector);
        }
      }
    }
  } catch (err) {
    console.error('[GDPR Audit] Failed to parse Consent-O-Matic rules:', err);
  }
  return Array.from(selectors).filter(s => s && s.length > 1);
}

// ─── DuckDuckGo Tracker Blocklist parser ──────────────────────────────────
/**
 * Parses the DuckDuckGo tds.json format.
 * Extracts only trackers in "Analytics" or "Advertising" categories.
 * Returns an array of { name, patterns[] } objects compatible with our trackers.json format.
 */
function parseDDGTrackers(tdsJson) {
  const result = [];
  const targetCategories = new Set([
    'Analytics',
    'Advertising',
    'Ad Motivated Tracking',
    'Audience Measurement',
    'Session Replay',
    'Fingerprinting',
    'Embedded Content'
  ]);

  try {
    const tds = typeof tdsJson === 'string' ? JSON.parse(tdsJson) : tdsJson;
    const trackerMap = tds.trackers || {};
    // Group by owner name to merge domains from same company
    const byOwner = {};
    for (const [domain, trackerData] of Object.entries(trackerMap)) {
      if (!trackerData) continue;
      const categories = trackerData.categories || [];
      // Only include trackers in our target categories
      const isRelevant = categories.some(cat => targetCategories.has(cat));
      if (!isRelevant) continue;

      const ownerName = (trackerData.owner && trackerData.owner.name) || domain;
      if (!byOwner[ownerName]) {
        byOwner[ownerName] = { name: ownerName, patterns: new Set() };
      }
      // Add the domain itself as a pattern
      byOwner[ownerName].patterns.add(domain);
      // Add rules as additional patterns (only defaultAction: block rules)
      if (Array.isArray(trackerData.rules)) {
        for (const rule of trackerData.rules) {
          if (rule.rule && (rule.action === undefined || rule.action === 'block' ||
              (rule.exceptions && Object.keys(rule.exceptions).length === 0))) {
            // Simplify regex to a plain domain pattern (take first segment before \/)
            const simplePattern = rule.rule.split('/')[0].replace(/\\/g, '').replace(/\^/g, '');
            if (simplePattern && simplePattern.includes('.') && simplePattern.length > 4) {
              byOwner[ownerName].patterns.add(simplePattern);
            }
          }
        }
      }
    }

    for (const [name, data] of Object.entries(byOwner)) {
      if (data.patterns.size > 0) {
        result.push({
          name: data.name,
          patterns: Array.from(data.patterns).slice(0, 10) // max 10 patterns per tracker
        });
      }
    }
  } catch (err) {
    console.error('[GDPR Audit] Failed to parse DuckDuckGo tracker list:', err);
  }
  return result;
}

// ─── Main fetch & cache function ──────────────────────────────────────────
async function fetchAndCacheRules(forceRefresh = false) {
  try {
    // Check if we have fresh cached rules
    const cached = await chrome.storage.local.get(['rules_updated_at', 'cmp_selectors_remote', 'tracker_rules_remote']);
    const lastUpdate = cached.rules_updated_at || 0;
    const now = Date.now();

    if (!forceRefresh && (now - lastUpdate) < RULES_TTL_MS && cached.cmp_selectors_remote && cached.tracker_rules_remote) {
      console.log('[GDPR Audit] Rules are fresh, skipping update. Age:', Math.round((now - lastUpdate) / 3600000), 'hours');
      return { status: 'fresh', updatedAt: lastUpdate };
    }

    console.log('[GDPR Audit] Fetching updated rules from online sources...');
    let cmpSelectors = null;
    let trackerRules = null;
    let fetchErrors = [];

    // ─── Fetch Consent-O-Matic CMP selectors ────────────────────────────
    try {
      const response = await fetch(RULES_SOURCES.consentOMatic, {
        signal: AbortSignal.timeout(15000) // 15s timeout
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      cmpSelectors = parseConsentOMatic(json);
      console.log(`[GDPR Audit] Consent-O-Matic: loaded ${cmpSelectors.length} CMP selectors`);
    } catch (err) {
      fetchErrors.push(`Consent-O-Matic: ${err.message}`);
      console.warn('[GDPR Audit] Failed to fetch Consent-O-Matic rules:', err.message);
    }

    // ─── Fetch DuckDuckGo Tracker Blocklist ─────────────────────────────
    try {
      const response = await fetch(RULES_SOURCES.ddgTrackers, {
        signal: AbortSignal.timeout(20000) // 20s timeout — file is ~1.5 MB
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      trackerRules = parseDDGTrackers(json);
      console.log(`[GDPR Audit] DuckDuckGo Tracker Radar: loaded ${trackerRules.length} tracker entries`);
    } catch (err) {
      fetchErrors.push(`DuckDuckGo Trackers: ${err.message}`);
      console.warn('[GDPR Audit] Failed to fetch DuckDuckGo tracker list:', err.message);
    }

    // ─── Persist to chrome.storage.local ────────────────────────────────
    const toStore = { rules_updated_at: now };
    if (cmpSelectors) toStore.cmp_selectors_remote = cmpSelectors;
    if (trackerRules) toStore.tracker_rules_remote = trackerRules;

    await chrome.storage.local.set(toStore);

    const status = fetchErrors.length === 0 ? 'updated'
                 : (cmpSelectors || trackerRules) ? 'partial'
                 : 'failed';

    console.log(`[GDPR Audit] Rules update complete. Status: ${status}`);
    return { status, updatedAt: now, errors: fetchErrors, cmpCount: cmpSelectors?.length, trackerCount: trackerRules?.length };

  } catch (err) {
    console.error('[GDPR Audit] Unexpected error during rules update:', err);
    return { status: 'failed', error: err.message };
  }
}

// ─── Schedule weekly alarm ─────────────────────────────────────────────────
async function scheduleRulesRefresh() {
  try {
    const existing = await chrome.alarms.get(ALARM_NAME);
    if (!existing) {
      // Fires once after 5 minutes delay, then every 7 days
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 5,
        periodInMinutes: 7 * 24 * 60 // 7 days
      });
      console.log('[GDPR Audit] Scheduled weekly rules refresh alarm.');
    }
  } catch (err) {
    console.error('[GDPR Audit] Failed to schedule rules alarm:', err);
  }
}

// ─── Alarm listener ───────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[GDPR Audit] Weekly rules refresh triggered by alarm.');
    fetchAndCacheRules(false);
  }
});

// ─── Exports (used by background.js) ─────────────────────────────────────
// These are called from background.js on install and startup.
// Also exposed on globalThis so background.js can call them after import via importScripts.
globalThis.fetchAndCacheRules = fetchAndCacheRules;
globalThis.scheduleRulesRefresh = scheduleRulesRefresh;
