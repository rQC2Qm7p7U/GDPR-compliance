// Multi-language consent button term lists
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
  'rifiuta', 'rifiuta tutto', 'nego', 'non accetto', 'non acconsento', 'continua sans accepter',
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

// Baseline storage snapshot for self-learning delta diffing
const beforeSnapshot = takeStorageSnapshot();

// Shared state variables
let currentPolicyScan = null;
let lastCmpRejectStatus = 'no_cmp';
let lastCmpBannerElement = null;

// Bundled CMP selectors (fallback if online rules not yet loaded)
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

// Load remote CMP selectors from cache (Consent-O-Matic)
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

// Read and restore learned signatures immediately
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

// Listen for events from main-world-injector.js
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
