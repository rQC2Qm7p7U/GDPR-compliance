/**
 * GDPR Consent Auditor - Tracker Databases & Matching Logic
 */

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
