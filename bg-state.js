/**
 * GDPR Consent Auditor - Tab State Management & Synchronization
 */

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
    policyDeepScan: null,
    dataMinimizationStatus: 'passed',
    cmpPolicyLinkDetected: 'no_cmp'
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
