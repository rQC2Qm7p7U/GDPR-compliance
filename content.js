/**
 * GDPR/CCPA Cookie Consent Auditor — Content Script
 * Detects CMP banners, privacy policy links, dark patterns, and user consent signals.
 */

// Check if the extension context is still valid (not invalidated by a reload/update)
function isContextValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

// Send message to background script only if context is valid
function safeSendMessage(message) {
  try {
    if (isContextValid()) {
      chrome.runtime.sendMessage(message);
    }
  } catch (err) {
    if (!err.message.includes('context invalidated')) {
      console.warn('[GDPR Audit] safeSendMessage error:', err);
    }
  }
}

// ─── Multi-language consent button term lists ─────────────────────────────
const ACCEPT_TERMS = [
  // English
  'accept', 'accept all', 'allow', 'allow all', 'agree', 'agree to all', 'consent', 'enable', 'ok', 'okay', 'fine',
  'i agree', 'i accept', 'i understand', 'got it', 'confirm', 'confirm my choices', 'save and exit',
  // Italian
  'accetta', 'accetto', 'consenti', 'accetta tutto', 'va bene', 'acconsento',
  // German
  'akzeptieren', 'erlauben', 'zustimmen', 'einverstanden', 'alle akzeptieren', 'ich stimme zu', 'ja akzeptieren',
  // French
  "accepter", 'autoriser', "tout accepter", "j'accepte", "j'accepte tout", "je suis d'accord",
  // Spanish
  'aceptar', 'permitir', 'de acuerdo', 'aceptar todo', 'acepto', 'sí, acepto',
  // Portuguese
  'aceitar', 'aceitar tudo', 'permitir tudo', 'concordar',
  // Dutch
  'toestaan', 'akkoord', 'alles accepteren', 'ik ga akkoord',
  // Polish
  "akceptuję", "zgadzam się", 'akceptuj wszystkie', 'zaakceptuj wszystkie',
  // Czech / Slovak
  "přijmout", "souhlasím", "přijmout vše", "súhlasím",
  // Swedish / Norwegian / Danish / Finnish
  'tillåt', 'godkänn', 'acceptera alla', 'tillad', 'godkend', 'accepter alle', 'hyväksy',
  // Croatian / Serbian / Bosnian / Slovenian
  'prihvati', "slažem", 'slazem', 'dozvoli', 'pristajem', 'prihvatam', 'prihvati sve', 'sprejmi', 'strinjam se', 'sprejmi vse',
  // Romanian
  'accept', 'accepta', 'acceptati',
  // Greek
  'αποδέχομαι', 'αποδοχή όλων',
  // Hungarian
  'elfogadom', 'engedélyezem', 'összes elfogadása',
  // Turkish
  'kabul et', 'hepsini kabul et',
  // Japanese
  '同意する', 'すべて同意する',
  // Chinese (Simplified)
  '同意', '接受所有',
  // Korean
  '동의합니다', '모두 동의',
  // Russian
  'принять', 'согласен', 'принять все'
];

const REJECT_TERMS = [
  // English
  'reject', 'reject all', 'deny', 'deny all', 'decline', 'decline all', 'refuse', 'refuse all',
  'disagree', 'opt-out', 'opt out', 'block all', 'no thanks', 'no thank you', 'not now',
  'continue without accepting', 'continue without agreeing', 'use necessary only', 'necessary only',
  'essential only', 'only essential', 'save preferences', 'manage preferences',
  'do not sell', 'do not sell my personal information', 'do not sell or share',
  // Italian
  'rifiuta', 'rifiuta tutto', 'nego', 'non accetto', 'non acconsento', 'continua senza accettare',
  'rifiuto', 'declino',
  // German
  'ablehnen', 'verweigern', 'nicht akzeptieren', 'alles ablehnen', 'alle ablehnen',
  'ohne zustimmung fortfahren', 'fortfahren ohne zu akzeptieren', 'weiter ohne zustimmung',
  'weiter ohne einwilligung', 'schließen & ablehnen', 'schließen und ablehnen',
  'schliessen und ablehnen', 'nur notwendige', 'nur essenzielle', 'nur essenziell',
  'einstellungen speichern', 'speichern & schließen', 'speichern und schließen',
  // French
  'refuser', 'interdire', 'tout refuser', 'continuer sans accepter', 'refuser tout',
  'uniquement nécessaires',
  // Spanish
  'rechazar', 'denegar', 'rechazar todo', 'solo necesarias', 'continuar sin aceptar',
  // Portuguese
  'rejeitar', 'rejeitar tudo', 'recusar', 'apenas necessários',
  // Dutch
  'weigeren', 'alles weigeren', 'doorgaan zonder toestemming', 'alleen noodzakelijke',
  // Polish
  "odrzuć", "odrzuć wszystkie", 'zablokuj wszystkie', 'tylko niezbędne',
  // Czech / Slovak
  "odmítnout", "odmítnout vše", "odmietnuť všetko",
  // Swedish / Norwegian / Danish / Finnish
  'avvisa', 'neka', 'avvisa alla', 'afvis', 'afvis alle', 'hylkää',
  // Croatian / Serbian / Bosnian / Slovenian
  'odbij', 'ne prihvatam', 'ne pristajem', 'blokiraj', 'odbij sve', 'zavrni', 'zavrni vse',
  // Romanian
  'refuz', 'refuzati', 'respinge',
  // Greek
  'απόρριψη', 'απόρριψη όλων',
  // Hungarian
  'elutasítom', 'visszautasítom', 'összes elutasítása',
  // Turkish
  'reddet', 'hepsini reddet',
  // Russian
  'отклонить', 'отказаться', 'отклонить все',
  // Chinese
  '拒绝', '拒绝所有'
];

// ─── Baseline storage snapshot for self-learning delta diffing ────────────
const beforeSnapshot = takeStorageSnapshot();

// ─── Bundled CMP selectors (fallback if online rules not yet loaded) ──────
const BUNDLED_CMP_SELECTORS = [
  // OneTrust
  '[id*="onetrust"]', '[class*="onetrust"]',
  '#onetrust-banner-sdk', '#onetrust-consent-sdk',
  // Didomi
  '[id*="didomi"]', '[class*="didomi"]', '#didomi-host', '#didomi-notice',
  // TrustArc / TRUSTe
  '[id*="truste"]', '[class*="truste"]', '[id*="trustarc"]', '[class*="trustarc"]',
  '#truste-consent-track', '#trustarc-banner',
  // Cookiebot
  '#CybotCookiebotDialog', '[id*="cookiebot"]', '[class*="cookiebot"]',
  '#CookieBanner', '.cookiebanner',
  // Quantcast
  '[id*="qc-cmp"]', '[class*="qc-cmp"]', '#qc-cmp2-container',
  // Usercentrics
  '[data-testid="uc-header"]', '#usercentrics-root',
  // Sourcepoint
  '[id*="sp_message"]', '[class*="sp_message"]', '#sp-cc',
  // Consent Manager
  '[id*="consent-manager"]', '[class*="consent-manager"]',
  // Generic cookie banners
  '[id*="cookie-banner"]', '[class*="cookie-banner"]',
  '[id*="cookiebanner"]', '[class*="cookiebanner"]',
  '[id*="cookieconsent"]', '[class*="cookieconsent"]',
  '[id*="cookie-consent"]', '[class*="cookie-consent"]',
  '[id*="cookie-notice"]', '[class*="cookie-notice"]',
  '[id*="cookie-law"]', '[class*="cookie-law"]',
  '[id*="gdpr-banner"]', '[class*="gdpr-banner"]',
  '[id*="privacy-banner"]', '[class*="privacy-banner"]',
  '[id*="consent-bar"]', '[class*="consent-bar"]',
  '#cmp-container', '.cmp-container',
  '#consent-banner', '.consent-banner',
  '#cookie-notice', '.cookie-notice',
  '#borlabs-cookie', '.borlabs-cookie',
  '#moove_gdpr_cookie_info_bar',
  '[id*="ppms_cm"]', '[class*="ppms_cm"]',
  '#axeptio_overlay', '[id*="axeptio"]',
  '#ccc', '#ccc-content', '.ccc-container',
  '#klaro', '.klaro',
  '[id*="cookiefirst"]', '[class*="cookiefirst"]',
  '#cmplz-cookiebanner', '[class*="cmplz-"]',
  '#iubenda-cs-banner', '[id*="iubenda"]',
  '[id*="wh-privacy"]',
  '[id*="termly"]', '[class*="termly"]',
  '#cookie-script-tagmanager', '[id*="cookiescript"]',
  '[role="dialog"][aria-label*="cookie"]',
  '[role="dialog"][aria-label*="consent"]',
  '[role="dialog"][aria-label*="privacy"]',
  'iframe[src*="generatehtml"]', 'iframe[src*="generatejs"]',
  'iframe[id*="consent"]', 'iframe[title*="consent"]',
  'iframe[title*="privacy"]', 'iframe[title*="cookie"]'
];

// Live merged selectors list (bundled + remote from Consent-O-Matic)
// Will be populated asynchronously after storage read
let activeCmpSelectors = [...BUNDLED_CMP_SELECTORS];

// ─── Load remote CMP selectors from cache (Consent-O-Matic) ──────────────
if (isContextValid()) {
  chrome.storage.local.get('cmp_selectors_remote', (data) => {
    if (data.cmp_selectors_remote && Array.isArray(data.cmp_selectors_remote)) {
      const remote = data.cmp_selectors_remote;
      const existing = new Set(activeCmpSelectors);
      let added = 0;
      for (const sel of remote) {
        // Only add valid, safe CSS selectors (basic sanity check)
        if (sel && typeof sel === 'string' && sel.length < 200 && !sel.includes('<') && !existing.has(sel)) {
          activeCmpSelectors.push(sel);
          existing.add(sel);
          added++;
        }
      }
      if (added > 0) {
        console.log(`[GDPR Audit] Loaded ${added} additional CMP selectors from Consent-O-Matic cache. Total: ${activeCmpSelectors.length}`);
      }
    }
  });
}

// ─── Read and restore learned signatures immediately ──────────────────────
const activeDomain = window.location.hostname;
if (isContextValid()) {
  chrome.storage.local.get(`learned_signatures_${activeDomain}`, (data) => {
    const signatures = data[`learned_signatures_${activeDomain}`];
    if (signatures && Array.isArray(signatures)) {
      for (const sig of signatures) {
        if (matchStorageSignature(sig)) {
          console.log(`[GDPR Audit] Learned signature matched on load: ${sig.action} via ${sig.storageType} key "${sig.key}"`);
          safeSendMessage({
            type: 'CMP_STATUS_CHANGE',
            status: sig.action,
            source: 'Learned_' + sig.storageType,
            eventStatus: 'tcloaded'
          });
          break;
        }
      }
    }
  });
}

// ─── Listen for events from main-world-injector.js ───────────────────────
window.addEventListener('EXTENSION_CONSENT_UPDATE', (event) => {
  if (!isContextValid()) return;
  if (event.detail) {
    safeSendMessage({
      type: 'CMP_STATUS_CHANGE',
      status: event.detail.status,
      source: event.detail.source,
      eventStatus: event.detail.eventStatus
    });
  }
});

// ─── Privacy policy link scanner ─────────────────────────────────────────
function scanPrivacyPolicy() {
  const keywords = [
    // English
    'privacy policy', 'cookie policy', 'privacy notice', 'privacy statement',
    'privacy disclosures', 'terms of service', 'legal notice', 'data policy',
    // German
    'datenschutzerklärung', 'datenschutz', 'cookie-richtlinie', 'impressum', 'datenschutzhinweise',
    // French
    'politique de confidentialité', 'charte de confidentialité', 'cookies', 'mentions légales', 'données personnelles',
    // Spanish
    'política de privacidad', 'política de cookies', 'aviso legal', 'privacidad',
    // Italian
    'informativa sulla privacy', 'politica sulla privacy', 'política dei cookie', 'note legali', 'privacy',
    // Polish
    'polityka prywatności', 'polityka cookies', 'regulamin',
    // Czech / Slovak
    'zásady ochrany osobních údajů', 'ochrana osobních údajů', 'zásady cookies',
    // Slovenian
    'politika zasebnosti', 'varstvo osebnih podatkov', 'politika piškotkov',
    // Croatian / Montenegrin / Serbian / Bosnian
    'politika privatnosti', 'zaštita osobnih podataka', 'pravila privatnosti',
    'politika kolačića', 'zaštita podataka', 'zastita podataka',
    // Dutch
    'privacybeleid', 'privacyverklaring', 'cookiebeleid',
    // Swedish / Danish / Norwegian / Finnish
    'integritetspolicy', 'cookiepolicy', 'personuppgifter', 'privatlivspolitik',
    'cookiepolitik', 'persondatapolitik', 'tietosuojakäytäntö',
    // Portuguese
    'política de privacidade', 'política de cookies',
    // Romanian
    'politica de confidentialitate', 'politica cookies',
    // Greek
    'πολιτική απορρήτου', 'πολιτική cookies',
    // Hungarian
    'adatvédelmi irányelvek', 'cookie-szabályzat',
    // Russian
    'политика конфиденциальности', 'политика cookies'
  ];

  const links = document.getElementsByTagName('a');
  for (let link of links) {
    const text = link.textContent ? link.textContent.toLowerCase().trim() : '';
    const href = link.getAttribute('href');
    if (!href) continue;
    const matchesKeyword = keywords.some(keyword => text.includes(keyword));
    if (matchesKeyword) {
      try {
        return new URL(href, window.location.href).href;
      } catch (e) {
        return href;
      }
    }
  }
  return null;
}

// ─── Check if policy link is inside footer or bottom 20% ─────────────────
function checkPolicyInFooter(policyLink) {
  if (!policyLink) return false;
  const links = document.getElementsByTagName('a');
  for (let link of links) {
    const href = link.getAttribute('href');
    if (href && (href.includes(policyLink) || policyLink.includes(href))) {
      let parent = link.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === 'footer') return true;
        parent = parent.parentElement;
      }
      try {
        const rect = link.getBoundingClientRect();
        const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        if (rect.top + window.scrollY > docHeight * 0.8) return true;
      } catch (e) {}
    }
  }
  return false;
}

// ─── Pre-checked checkbox detection ──────────────────────────────────────
function checkFormCheckboxes() {
  const forms = document.getElementsByTagName('form');
  if (forms.length === 0) return 'no_forms';
  let hasCheckboxes = false;
  for (let form of forms) {
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) hasCheckboxes = true;
    for (let cb of checkboxes) {
      if (cb.checked) return true; // Violation: pre-checked box found!
    }
  }
  return hasCheckboxes ? false : 'no_checkboxes';
}

// ─── Form policy link check ───────────────────────────────────────────────
function checkFormPolicyLink(policyLink) {
  const forms = document.getElementsByTagName('form');
  if (forms.length === 0) return 'no_forms';
  if (!policyLink) return false;
  for (let form of forms) {
    const links = form.querySelectorAll('a');
    for (let link of links) {
      const href = link.getAttribute('href');
      if (href && (href.includes(policyLink) || policyLink.includes(href))) return true;
    }
  }
  return false;
}

// ─── Shadow DOM aware element search ─────────────────────────────────────
function querySelectorDeep(selector, root) {
  root = root || document;
  try {
    const found = root.querySelector(selector);
    if (found) return found;
    // If the root itself has a shadowRoot, look inside it
    if (root.shadowRoot) {
      const shadowResult = querySelectorDeep(selector, root.shadowRoot);
      if (shadowResult) return shadowResult;
    }
    // Walk all shadow roots of descendants
    const allElements = root.querySelectorAll('*');
    for (let el of allElements) {
      if (el.shadowRoot) {
        const shadowResult = querySelectorDeep(selector, el.shadowRoot);
        if (shadowResult) return shadowResult;
      }
    }
  } catch (e) {}
  return null;
}

function querySelectorAllDeep(selector, root) {
  root = root || document;
  const results = [];
  try {
    results.push(...Array.from(root.querySelectorAll(selector)));
    // If the root itself has a shadowRoot, look inside it
    if (root.shadowRoot) {
      results.push(...querySelectorAllDeep(selector, root.shadowRoot));
    }
    // Walk all shadow roots of descendants
    const allElements = root.querySelectorAll('*');
    for (let el of allElements) {
      if (el.shadowRoot) {
        results.push(...querySelectorAllDeep(selector, el.shadowRoot));
      }
    }
  } catch (e) {}
  return results;
}

/**
 * Finds a leaf element (e.g., div, span, p, button, a) inside a root element 
 * that matches one of the specified term lists. Ensures it is the deepest matching node.
 */
function findElementByText(root, terms) {
  const elements = querySelectorAllDeep('*', root);
  for (let el of elements) {
    const text = el.textContent ? el.textContent.toLowerCase().trim() : '';
    if (!text) continue;
    // Check if the element text matches the term exactly, starts with it, or is very close
    if (terms.some(term => text === term || text.startsWith(term) || (text.includes(term) && text.length < term.length + 15))) {
      // Check if it has child elements that also contain any of the terms
      let hasMatchingChild = false;
      const children = Array.from(el.children);
      for (let child of children) {
        const childText = child.textContent ? child.textContent.toLowerCase().trim() : '';
        if (childText && terms.some(term => childText === term || childText.includes(term))) {
          hasMatchingChild = true;
          break;
        }
      }
      if (!hasMatchingChild) {
        console.log(`[GDPR Audit] findElementByText: matched leaf node tag=${el.tagName}, text="${text.substring(0, 40)}", terms=${terms === ACCEPT_TERMS ? 'ACCEPT' : 'REJECT'}`);
        return el;
      }
    }
  }
  return null;
}

// ─── CMP banner scanner with Shadow DOM + iframe support ─────────────────
function scanCmpBanner() {
  // Use the live merged selectors list (bundled + Consent-O-Matic remote)
  const cmpSelectors = activeCmpSelectors;

  // Diagnostic: search all elements in the document for the words 'ablehnen' or 'einverstanden'
  try {
    const allEl = querySelectorAllDeep('*', document);
    const matchedText = [];
    for (let el of allEl) {
      const txt = (el.textContent || '').toLowerCase().trim();
      if (txt.includes('ablehnen') || txt.includes('einverstanden')) {
        matchedText.push(`${el.tagName}(text="${txt.substring(0, 30)}", children=${el.children.length})`);
      }
    }
    console.log(`[GDPR Audit] scanCmpBanner diagnostic: href="${window.location.href}", totalElements=${allEl.length}, matches=[${matchedText.slice(0, 5).join(', ')}]`);
  } catch (e) {
    console.warn('[GDPR Audit] Diagnostic log failed:', e);
  }

  let banner = null;

  // First: standard DOM search
  for (let selector of cmpSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el && (el.offsetHeight > 0 || el.tagName === 'IFRAME')) {
        banner = el;
        break;
      }
    } catch (e) {}
  }

  // Second: Shadow DOM deep search (for UserCentrics, OneTrust web components)
  if (!banner) {
    for (let selector of cmpSelectors) {
      try {
        const el = querySelectorDeep(selector);
        if (el && (el.offsetHeight > 0 || el.tagName === 'IFRAME')) {
          banner = el;
          break;
        }
      } catch (e) {}
    }
  }

  // Third: Scoring Heuristic Fallback
  if (!banner) {
    let bestCandidate = null;
    let maxScore = -1;

    try {
      const allElements = querySelectorAllDeep('*', document);
      
      for (let el of allElements) {
        if (!el || el === document.body || el === document.documentElement || el.tagName === 'HTML' || el.tagName === 'BODY') {
          continue;
        }
        
        let cheapScore = 0;
        const tagName = el.tagName.toUpperCase();
        const role = el.getAttribute('role') || '';
        const id = el.id || '';
        const className = typeof el.className === 'string' ? el.className : '';
        const text = (el.textContent || '').toLowerCase();
        
        // 1. Dialog role or tag (+5)
        const isDialog = (tagName === 'DIALOG' || role.toLowerCase() === 'dialog' || role.toLowerCase() === 'alertdialog');
        if (isDialog) {
          cheapScore += 5;
        }
        
        // 2. Custom tag containing consent keywords (+3)
        if (tagName.includes('-')) {
          const tagLower = tagName.toLowerCase();
          if (tagLower.includes('consent') || tagLower.includes('cookie') || tagLower.includes('privacy') || tagLower.includes('cmp') || tagLower.includes('banner')) {
            cheapScore += 3;
          }
        }
        
        // 3. ID or Class contains keywords (+3)
        const classOrId = (id + ' ' + className).toLowerCase();
        const hasCmpKeyword = classOrId.includes('cookie') || classOrId.includes('consent') || 
                              classOrId.includes('privacy') || classOrId.includes('gdpr') || 
                              classOrId.includes('cmp') || classOrId.includes('onetrust') || 
                              classOrId.includes('cookiebot') || classOrId.includes('usercentrics') || 
                              classOrId.includes('didomi') || classOrId.includes('sp_message') ||
                              classOrId.includes('sp-cc');
        if (hasCmpKeyword) {
          cheapScore += 3;
        }
        
        // 4. Text contains core cookie/consent keywords (+4)
        const hasConsentText = text.includes('cookie') || text.includes('consent') ||
                              text.includes('privacy') || text.includes('gdpr') ||
                              text.includes('tracking') || text.includes('personal data') ||
                              text.includes('einwilligung') || text.includes('ablehnen') ||
                              text.includes('akzeptieren') || text.includes('einverstanden');
        if (hasConsentText) {
          cheapScore += 4;
        }
        
        // 5. Button Presence check (+8 for both, +3 for one)
        let hasAccept = false;
        let hasReject = false;
        
        const children = el.children;
        if (children && children.length > 0) {
          const BUTTON_LIKE = 'button, a, [role="button"], sp-button, uc-button, cm-button, [class*="button" i], [class*="btn" i]';
          // Find buttons only inside the candidate itself
          const descAll = el.querySelectorAll(BUTTON_LIKE);
          for (let desc of descAll) {
            const descText = (desc.textContent || '').toLowerCase().trim();
            if (!descText) continue;
            
            const isWordMatch = (val, terms) => {
              return terms.some(term => 
                val === term || 
                val.startsWith(term) || 
                (val.includes(term) && val.length < term.length + 15)
              );
            };

            if (!hasReject && isWordMatch(descText, REJECT_TERMS)) {
              hasReject = true;
            }
            if (!hasAccept && isWordMatch(descText, ACCEPT_TERMS)) {
              hasAccept = true;
            }
            if (hasAccept && hasReject) break;
          }
        }
        
        if (hasAccept && hasReject) {
          cheapScore += 8;
        } else if (hasAccept || hasReject) {
          cheapScore += 3;
        }
        
        // Promoted candidate check (must score >= 5 to justify computed style scan)
        if (cheapScore >= 5) {
          try {
            const style = window.getComputedStyle(el);
            const pos = style.position;
            
            let computedScore = 0;
            
            // 1. Overlay position (+5)
            if (pos === 'fixed' || pos === 'sticky' || pos === 'absolute') {
              computedScore += 5;
            }
            
            // 2. High z-index (+2)
            const zIndex = parseInt(style.zIndex, 10);
            if (!isNaN(zIndex) && zIndex > 10) {
              computedScore += 2;
            }
            
            // 3. Reasonable dimensions (+2)
            const h = el.offsetHeight || parseFloat(style.height) || 0;
            const w = el.offsetWidth || parseFloat(style.width) || 0;
            if (h > 40 && h < window.innerHeight * 0.95 && w > 100) {
              computedScore += 2;
            }
            
            // 4. Visibility (+3)
            const display = style.display;
            const visibility = style.visibility;
            const opacity = parseFloat(style.opacity);
            if (display !== 'none' && visibility !== 'hidden' && (isNaN(opacity) || opacity > 0.1)) {
              computedScore += 3;
            }
            
            const finalScore = cheapScore + computedScore;
            if (finalScore >= 8 && finalScore > maxScore) {
              maxScore = finalScore;
              bestCandidate = el;
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('[GDPR Audit] Heuristic scoring failed:', err);
    }
    
    if (bestCandidate) {
      banner = bestCandidate;
      console.log(`[GDPR Audit] Heuristic match selected banner with score ${maxScore}: tag=${banner.tagName}, id=${banner.id}, class=${banner.className}`);
    }
  }

  // Fourth: CMP frame self-detection
  if (!banner) {
    const isCmpFrame = window.location.href.includes('generatehtml') ||
                       window.location.href.includes('generatejs') ||
                       window.location.href.includes('privacy-manager') ||
                       window.location.href.includes('cookielaw') ||
                       window.location.href.includes('sp-cloud') ||
                       window.location.href.includes('consent.') ||
                       window.location.href.includes('cmp.') ||
                       window.self !== window.top; // inside iframe
    if (isCmpFrame && document.body) {
      banner = document.body;
    }
  }

  if (!banner) return 'no_cmp';

  // ─── Find clickable elements (including Shadow DOM) ─────────────────────
  const CLICKABLE_SELECTOR = 'button, a, [role="button"], sp-button, uc-button, cm-button, [class*="button" i], [class*="btn" i], [id*="button" i], [id*="btn" i]';
  const clickables = querySelectorAllDeep(CLICKABLE_SELECTOR, banner);

  let acceptEl = null;
  let rejectEl = null;

  const isMatch = (val, terms) => {
    return terms.some(term => 
      val === term || 
      val.startsWith(term) || 
      (val.includes(term) && val.length < term.length + 15)
    );
  };

  clickables.forEach(el => {
    const text = el.textContent ? el.textContent.toLowerCase().trim() : '';
    if (!text) return;
    
    if (!rejectEl && isMatch(text, REJECT_TERMS)) {
      rejectEl = el;
    } else if (!acceptEl && isMatch(text, ACCEPT_TERMS)) {
      acceptEl = el;
    }
  });

  // Fallback: search deep for leaf elements matching terms in div/span/p if clickables didn't yield them
  if (!acceptEl || !rejectEl) {
    if (!acceptEl) {
      acceptEl = findElementByText(banner, ACCEPT_TERMS);
    }
    if (!rejectEl) {
      rejectEl = findElementByText(banner, REJECT_TERMS);
    }
  }

  let resultStatus = 'no_cmp';
  if (acceptEl && !rejectEl) {
    resultStatus = 'missing';
  } else if (acceptEl && rejectEl) {
    resultStatus = 'detected';
    try {
      const styleAccept = window.getComputedStyle(acceptEl);
      const styleReject = window.getComputedStyle(rejectEl);

      const bgAccept = styleAccept.backgroundColor;
      const bgReject = styleReject.backgroundColor;
      const wAccept = acceptEl.offsetWidth || parseFloat(styleAccept.width) || 0;
      const wReject = rejectEl.offsetWidth || parseFloat(styleReject.width) || 0;
      const hAccept = acceptEl.offsetHeight || parseFloat(styleAccept.height) || 0;
      const hReject = rejectEl.offsetHeight || parseFloat(styleReject.height) || 0;
      const opAccept = parseFloat(styleAccept.opacity) || 1;
      const opReject = parseFloat(styleReject.opacity) || 1;
      const fontSizeAccept = parseFloat(styleAccept.fontSize) || 0;
      const fontSizeReject = parseFloat(styleReject.fontSize) || 0;

      // Color difference
      const bgDiff = bgAccept !== bgReject;
      // Size difference > 20%
      const sizeDiff = (wAccept > 0 && wReject > 0 && Math.abs(wAccept - wReject) > (wAccept * 0.2)) ||
                       (hAccept > 0 && hReject > 0 && Math.abs(hAccept - hReject) > (hAccept * 0.2));
      // Opacity difference
      const opacityDiff = Math.abs(opAccept - opReject) > 0.2;
      // Font size difference > 20%
      const fontSizeDiff = fontSizeAccept > 0 && fontSizeReject > 0 &&
                           Math.abs(fontSizeAccept - fontSizeReject) > (fontSizeAccept * 0.2);

      if (bgDiff || sizeDiff || opacityDiff || fontSizeDiff) {
        resultStatus = 'unequal'; // Reject exists but with visual dark pattern
      }
    } catch (e) {
      console.warn('[GDPR Audit] Computed styling comparison failed:', e);
    }
  }

  console.log(`[GDPR Audit] scanCmpBanner: isTopFrame=${window === window.top}, bannerFound=${!!banner}, acceptEl=${acceptEl ? acceptEl.tagName + '(' + acceptEl.textContent.trim().substring(0, 30) + ')' : 'null'}, rejectEl=${rejectEl ? rejectEl.tagName + '(' + rejectEl.textContent.trim().substring(0, 30) + ')' : 'null'} -> returning ${resultStatus}`);
  return resultStatus;
}

// ─── Deep privacy policy text analysis ───────────────────────────────────
function scanPrivacyPolicyText(text) {
  const lowercaseText = text.toLowerCase();

  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(lowercaseText);
  const dpoKeywords = [
    'dpo', 'data protection officer', 'kontakt osoba', 'lice zaduženo', 'lice zaduzeno',
    'zastita@', 'zaštita@', 'privacy@', 'privatnost@', 'dpo@',
    'datenschutzbeauftragte', 'datenschutzbeauftragter',
    'délégué à la protection des données',
    'delegado de protección de datos',
    'responsabile della protezione dei dati',
    'inspektor ochrony danych', 'iod',
    'pověřenec pro ochranu osobních údajů',
    'pooblaščena oseba za varstvo podatkov',
    'službenik za zaštitu podataka',
    'functionaris voor gegevensbescherming',
    'dataskyddsombud', 'databeskyttelsesrådgiver'
  ];
  const hasDpo = dpoKeywords.some(keyword => lowercaseText.includes(keyword)) || hasEmail;

  const transparencyKeywords = [
    'collect', 'store', 'transfer', 'third parties', 'share', 'purpose', 'legal basis',
    'processing', 'retention', 'duration', 'data controller',
    'prikuplj', 'obrađ', 'obrad', 'svrha', 'prenos', 'treća lica', 'pravni osnov',
    'erheben', 'speichern', 'übermitteln', 'dritte', 'zweck', 'rechtsgrundlage',
    'collecter', 'stocker', 'transférer', 'tiers', 'partager', 'finalité', 'base juridique',
    'recopilar', 'almacenar', 'transferir', 'terceros', 'compartir', 'finalidad', 'base legal',
    'raccogliere', 'conservare', 'trasferire', 'terze parti', 'condividere', 'finalità', 'base giuridica',
    'zbierać', 'przechowywać', 'przekazywać', 'podmioty trzecie', 'cel', 'podstawa prawna',
    'verzamelen', 'bewaren', 'overdragen', 'derden', 'doel', 'rechtsgrondslag',
    'samla', 'lagra', 'överföra', 'tredje part', 'ändamål', 'rättslig grund',
    'indsamle', 'opbevare', 'overføre', 'tredjeparter', 'formål', 'retsgrundlag'
  ];
  const transparencyCount = transparencyKeywords.filter(kw => lowercaseText.includes(kw)).length;
  const hasTransparency = transparencyCount >= 4;

  const rightsKeywords = [
    'access', 'rectify', 'erase', 'portability', 'restrict', 'object', 'delete', 'right to be forgotten',
    'pravo na pristup', 'ispravku', 'brisanje', 'prigovor', 'pravo na zaborav', 'prenosivost',
    'auskunft', 'berichtigung', 'löschung', 'übertragbarkeit', 'einschränkung', 'widerspruch',
    "accès", 'rectification', 'effacement', 'portabilité', 'limitation', 'opposition',
    'acceso', 'rectificación', 'supresión', 'portabilidad', 'limitación', 'oposición',
    'accesso', 'rettifica', 'cancellazione', 'portabilità', 'limitazione',
    'dostęp', 'sprostowanie', 'usunięcie', 'przenoszenie', 'ograniczenie', 'sprzeciw',
    'inzage', 'rectificatie', 'overdraagbaarheid', 'beperking', 'bezwaar',
    'tillgång', 'rättelse', 'radering', 'dataportabilitet', 'begränsning', 'invändning',
    'indsigt', 'berigtigelse', 'sletning', 'begrænsning', 'indsigelse'
  ];
  const rightsCount = rightsKeywords.filter(kw => lowercaseText.includes(kw)).length;
  const hasRights = rightsCount >= 4;

  const legaleseKeywords = [
    'heretofore', 'hereinunder', 'hereinabove', 'shall represent', 'hereby',
    'shodno članu', 'u skladu sa članom', 'in Verbindung mit', 'unbeschadet dessen',
    'ci-après', 'en vertu de', 'en virtud de', 'ai sensi del', 'in virtù di',
    'niniejszym', 'w świetle obowiązujących', 'krachtens', 'onverminderd'
  ];
  const legaleseCount = legaleseKeywords.filter(kw => lowercaseText.includes(kw)).length;
  const isPlainLanguage = legaleseCount < 4;

  return { hasDpo, hasTransparency, hasRights, isPlainLanguage };
}

// ─── State ────────────────────────────────────────────────────────────────
let fetchedPolicyUrl = null;
let currentPolicyScan = null;
let lastCmpRejectStatus = 'no_cmp';

async function runPolicyDeepScan(policyUrl) {
  if (fetchedPolicyUrl === policyUrl) return;
  fetchedPolicyUrl = policyUrl;
  try {
    const response = await fetch(policyUrl);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const text = doc.body ? doc.body.innerText : '';
    currentPolicyScan = scanPrivacyPolicyText(text);
    sendDOMData();
  } catch (err) {
    console.warn('[GDPR Audit] Privacy policy pre-fetch failed:', err.message);
  }
}

// ─── Main DOM data sender ─────────────────────────────────────────────────
function sendDOMData() {
  const privacyPolicyLink = scanPrivacyPolicy();
  const lang = document.documentElement.lang || '';
  const policyInFooter = checkPolicyInFooter(privacyPolicyLink);
  const preCheckedCheckboxes = checkFormCheckboxes();
  const hasFormPolicyLink = checkFormPolicyLink(privacyPolicyLink);
  const cmpRejectStatus = scanCmpBanner();
  lastCmpRejectStatus = cmpRejectStatus;

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
  } else if (privacyPolicyLink && !currentPolicyScan && privacyPolicyLink.startsWith(window.location.origin)) {
    runPolicyDeepScan(privacyPolicyLink);
  }

  safeSendMessage({
    type: 'DOM_SCRAPE_RESULTS',
    privacyPolicyLink,
    lang,
    policyInFooter,
    preCheckedCheckboxes,
    hasFormPolicyLink,
    cmpRejectStatus,
    policyDeepScan: currentPolicyScan,
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
