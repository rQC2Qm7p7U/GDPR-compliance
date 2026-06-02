/**
 * GDPR/CCPA Cookie Consent Auditor — Content Script Coordinator
 */

// Note: Shared state variables, constants, DOM utils, policy, form and CMP scanner functions
// are loaded sequentially from storage-helper.js, content-constants.js, content-dom-utils.js,
// content-policy-scanner.js, content-form-scanner.js, and content-cmp-scanner.js.

// ─── Main DOM data sender ─────────────────────────────────────────────────
function sendDOMData() {
  const privacyPolicyLink = scanPrivacyPolicy();
  const lang = document.documentElement.lang || '';
  const policyInFooter = checkPolicyInFooter(privacyPolicyLink);
  const preCheckedCheckboxes = checkFormCheckboxes();
  const hasFormPolicyLink = checkFormPolicyLink(privacyPolicyLink);
  const cmpRejectStatus = scanCmpBanner();
  lastCmpRejectStatus = cmpRejectStatus;
  const cmpPolicyLinkDetected = checkCmpPolicyLink();

  const currentUrl = window.location.href.toLowerCase();
  const isCurrentlyPolicyPage =
    currentUrl.includes('privacy') ||
    currentUrl.includes('politika-privatnosti') ||
    currentUrl.includes('datenschutz') ||
    currentUrl.includes('confidentialite') ||
    currentUrl.includes('privacidad') ||
    currentUrl.includes('cookie') ||
    currentUrl.includes('legal') ||
    (privacyPolicyLink && currentUrl === privacyPolicyLink.toLowerCase());

  if (isCurrentlyPolicyPage) {
    currentPolicyScan = scanPrivacyPolicyText(document.body.innerText);
  } else if (privacyPolicyLink && !currentPolicyScan) {
    // Notify background script to fetch and scan this URL (bypassing CORS)
    safeSendMessage({ type: 'SCAN_POLICY_URL', url: privacyPolicyLink });
  }

  safeSendMessage({
    type: 'DOM_SCRAPE_RESULTS',
    privacyPolicyLink,
    lang,
    policyInFooter,
    preCheckedCheckboxes,
    hasFormPolicyLink,
    cmpRejectStatus,
    cmpPolicyLinkDetected,
    policyDeepScan: currentPolicyScan,
    dataMinimizationStatus: checkDataMinimization(),
    isTopFrame: window === window.top
  });
}

// ─── MutationObserver — detect dynamically injected CMP banners ───────────
let scanTimeout = null;
const observer = new MutationObserver((mutations) => {
  if (!isContextValid()) {
    observer.disconnect();
    return;
  }
  let shouldScrape = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldScrape = true;
      break;
    }
  }
  if (shouldScrape) {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
      sendDOMData();
    }, 1000);
  }
});

function initScanner() {
  sendDOMData();
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  window.addEventListener('load', sendDOMData);

  // Poll a few times after page load to catch late-rendering elements/iframes/shadow DOM contents
  let pollCount = 0;
  const pollInterval = setInterval(() => {
    if (!isContextValid()) {
      clearInterval(pollInterval);
      return;
    }
    sendDOMData();
    pollCount++;
    
    // Stop polling early if we successfully detect the banner and buttons
    const isBannerFullyDetected = (lastCmpRejectStatus === 'detected' || lastCmpRejectStatus === 'unequal');
    if (isBannerFullyDetected || pollCount >= 15) {
      clearInterval(pollInterval);
    }
  }, 2000);
}

if (document.readyState === 'complete') {
  initScanner();
} else {
  window.addEventListener('DOMContentLoaded', initScanner);
}

// ─── Generic click interceptor (capturing phase) for all CMPs ────────────
document.addEventListener('click', (event) => {
  if (!isContextValid()) return;
  let target = event.target.closest('button, a, [role="button"]');

  const isCmpFrame = window.location.href.includes('generatehtml') ||
                     window.location.href.includes('generatejs') ||
                     window.location.href.includes('privacy-manager') ||
                     window.location.href.includes('cookielaw') ||
                     window.location.href.includes('sp-cloud') ||
                     window.location.href.includes('consent.');

  // Extended CMP selector list for click matching
  const cmpSelectorStr =
    '[id*="onetrust"], [class*="onetrust"], ' +
    '[id*="didomi"], [class*="didomi"], ' +
    '[id*="truste"], [class*="truste"], ' +
    '[id*="trustarc"], [class*="trustarc"], ' +
    '[id*="cookiebot"], [class*="cookiebot"], ' +
    '[id*="CybotCookiebot"], [class*="CybotCookiebot"], ' +
    '[id*="qc-cmp"], [class*="qc-cmp"], ' +
    '[id*="sp_message"], [class*="sp_message"], ' +
    '[id*="borlabs"], [class*="borlabs"], ' +
    '[id*="klaro"], [class*="klaro"], ' +
    '[id*="axeptio"], [class*="axeptio"], ' +
    '[id*="iubenda"], [class*="iubenda"], ' +
    '[id*="cmplz"], [class*="cmplz"], ' +
    '[id*="termly"], [class*="termly"], ' +
    '[id*="cookiescript"], [class*="cookiescript"], ' +
    '[id*="cookie-banner"], [class*="cookie-banner"], ' +
    '[id*="cookiebanner"], [class*="cookiebanner"], ' +
    '[id*="cookieconsent"], [class*="cookieconsent"], ' +
    '[id*="cookie-consent"], [class*="cookie-consent"], ' +
    '[id*="cookie-law"], [class*="cookie-law"], ' +
    '[id*="gdpr-banner"], [class*="gdpr-banner"], ' +
    '[id*="privacy-banner"], [class*="privacy-banner"], ' +
    '[id*="consent-bar"], [class*="consent-bar"], ' +
    '#cmp-container, .cmp-container, ' +
    '#consent-banner, .consent-banner, ' +
    '#cookie-notice, .cookie-notice, ' +
    '#moove_gdpr_cookie_info_bar';

  let isCmpClick = isCmpFrame;
  if (!isCmpClick && target) {
    try {
      isCmpClick = !!target.closest(cmpSelectorStr);
    } catch (e) {}
  } else if (!isCmpClick && !target) {
    try {
      isCmpClick = !!event.target.closest(cmpSelectorStr);
    } catch (e) {}
  }

  // Heuristic fallback: check if any ancestor looks like a cookie banner
  if (!isCmpClick) {
    let p = target ? target.parentElement : event.target;
    let depth = 0;
    while (p && depth < 8) {
      const idCls = ((p.id || '') + ' ' + (p.className || '')).toLowerCase();
      if (idCls.includes('cookie') || idCls.includes('consent') || idCls.includes('gdpr') ||
          idCls.includes('privacy') || idCls.includes('cmp')) {
        isCmpClick = true;
        break;
      }
      p = p.parentElement;
      depth++;
    }
  }

  // If it's a CMP click but not a standard clickable element, fall back to the closest div/span/p or event.target
  if (isCmpClick && !target) {
    target = event.target.closest('div, span, p') || event.target;
  }

  if (!target) return;
  if (!isCmpClick) return;

  let text = target.textContent ? target.textContent.toLowerCase().trim() : '';

  // Fallback: check attributes if text is empty (e.g. icon buttons)
  if (!text) {
    const img = target.querySelector('img');
    const alt = img ? img.getAttribute('alt') : '';
    const ariaLabel = target.getAttribute('aria-label');
    const title = target.getAttribute('title');
    const id = target.id || '';
    const className = (typeof target.className === 'string') ? target.className : '';
    text = ((alt || '') + ' ' + (ariaLabel || '') + ' ' + (title || '') + ' ' + id + ' ' + className).toLowerCase().trim();
  }

  if (!text) return;

  let status = null;

  // Check reject terms (including TrustArc IDs which use onclick delegation)
  if (
    REJECT_TERMS.some(term => text === term || text.includes(term)) ||
    text.includes('truste-consent-required') ||
    text.includes('truste-required-btn') ||
    text.includes('required-btn') ||
    target.id === 'truste-consent-required' ||
    target.id === 'truste-consent-required2'
  ) {
    status = 'rejected';
  } else if (
    ACCEPT_TERMS.some(term => text === term || text.includes(term)) ||
    text.includes('truste-consent-button') ||
    text.includes('truste-close') ||
    target.id === 'truste-consent-button'
  ) {
    status = 'accepted';
  }

  if (status) {
    // Source identification
    let source = 'Fallback_DOM';
    const selectorSourceMap = {
      'truste': 'TrustArc',
      'trustarc': 'TrustArc',
      'onetrust': 'OneTrust',
      'didomi': 'Didomi',
      'cookieconsent': 'CookieConsent',
      'cookiebot': 'Cookiebot',
      'cybot': 'Cookiebot',
      'qc-cmp': 'Quantcast',
      'borlabs': 'Borlabs',
      'klaro': 'Klaro',
      'axeptio': 'Axeptio',
      'iubenda': 'Iubenda',
      'cmplz': 'Complianz',
      'termly': 'Termly',
      'sp_message': 'Sourcepoint',
      'cookiescript': 'CookieScript'
    };

    const parent = target.closest('[id], [class]');
    if (parent) {
      const idOrClass = ((parent.id || '') + ' ' + ((typeof parent.className === 'string') ? parent.className : '')).toLowerCase();
      for (const [key, name] of Object.entries(selectorSourceMap)) {
        if (idOrClass.includes(key)) {
          source = name;
          break;
        }
      }
    }

    if (source === 'Fallback_DOM' && isCmpFrame) {
      source = 'Iframe_CMP';
    }

    console.log(`[GDPR Audit] DOM Click: ${status} via ${source} — "${text.substring(0, 80)}"`);
    safeSendMessage({
      type: 'CMP_STATUS_CHANGE',
      status,
      source,
      eventStatus: 'useractioncomplete'
    });

    // ─── Self-learning: capture storage delta after CMP write ────────────
    setTimeout(() => {
      try {
        if (!isContextValid()) return;
        if (typeof takeStorageSnapshot !== 'function' || typeof computeStorageDelta !== 'function') return;
        const afterSnapshot = takeStorageSnapshot();
        const delta = computeStorageDelta(beforeSnapshot, afterSnapshot);

        if (delta.length > 0) {
          let bestMatch = delta.find(d => d.type === 'cookies' && (d.action === 'added' || d.action === 'changed'));
          if (!bestMatch) bestMatch = delta.find(d => d.type === 'localStorage' && (d.action === 'added' || d.action === 'changed'));
          if (!bestMatch) bestMatch = delta.find(d => d.type === 'sessionStorage' && (d.action === 'added' || d.action === 'changed'));

          if (bestMatch) {
            const signature = {
              domain: window.location.hostname,
              action: status,
              storageType: bestMatch.type === 'cookies' ? 'cookie' : (bestMatch.type === 'localStorage' ? 'local' : 'session'),
              key: bestMatch.key,
              valPattern: bestMatch.value ? bestMatch.value.substring(0, 100) : ''
            };
            console.log('[GDPR Audit] Learned consent storage signature:', signature);
            safeSendMessage({ type: 'LEARNED_SIGNATURE', signature });
          }
        }
      } catch (err) {
        console.error('[GDPR Audit] Failed to compute storage delta:', err);
      }
    }, 800);
  }
}, true); // Capturing phase — intercepts even if target calls stopPropagation()
