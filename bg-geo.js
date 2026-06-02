/**
 * GDPR Consent Auditor - Geolocation & Region Utilities
 */

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
