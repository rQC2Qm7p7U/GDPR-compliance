(function () {
  'use strict';

  const POLLING_INTERVAL = 500;
  const MAX_POLLING_ATTEMPTS = 40; // 20 seconds total polling
  let attempts = 0;
  let tcfListenerRegistered = false;
  let gppListenerRegistered = false;
  let lastStatus = null;
  let lastSource = null;
  let lastEventStatus = null;

  function sendStatusToExtension(status, source, eventStatus) {
    if (status === lastStatus && source === lastSource && eventStatus === lastEventStatus) return;
    lastStatus = status;
    lastSource = source;
    lastEventStatus = eventStatus;

    window.dispatchEvent(new CustomEvent('EXTENSION_CONSENT_UPDATE', {
      detail: { status, source, eventStatus }
    }));
  }

  // ─── 1. IAB TCF v2.x (European Standard) ─────────────────────────────────
  function checkTcf() {
    if (typeof window.__tcfapi !== 'function' || tcfListenerRegistered) return false;
    try {
      window.__tcfapi('addEventListener', 2, (tcData, success) => {
        if (!success || !tcData) return;
        let status = 'unknown';
        if (tcData.gdprApplies === false) {
          status = 'not_applicable';
        } else if (tcData.eventStatus === 'cmpuishown') {
          status = 'unknown';
        } else if (tcData.eventStatus === 'tcloaded' || tcData.eventStatus === 'useractioncomplete') {
          const consents = tcData.purpose && tcData.purpose.consents;
          if (consents) {
            // Purpose 1 = Store/access info on device, Purpose 4 = Select personalised ads
            const hasStorageConsent = consents[1] === true;
            const hasMarketingConsent = consents[4] === true;
            status = (hasStorageConsent || hasMarketingConsent) ? 'accepted' : 'rejected';
          } else {
            status = 'unknown';
          }
        }
        sendStatusToExtension(status, 'IAB_TCF', tcData.eventStatus || 'tcloaded');
      });
      tcfListenerRegistered = true;
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error registering IAB TCF listener:', err);
      return false;
    }
  }

  // ─── 2. IAB GPP (Global Privacy Platform) v1.1 ───────────────────────────
  function checkGpp() {
    if (typeof window.__gpp !== 'function' || gppListenerRegistered) return false;
    try {
      window.__gpp('addEventListener', (evt, success) => {
        if (!success || !evt) return;
        const { pingData } = evt;
        if (!pingData) return;
        const { applicableSections, signalStatus } = pingData;
        // Section 2 = EU TCF, Section 8 = US National Privacy
        let status = 'unknown';
        if (signalStatus === 'ready') {
          // If EUCS or US signal sections are not applicable
          if (!applicableSections || applicableSections.length === 0) {
            status = 'not_applicable';
          } else {
            // Read consent string
            window.__gpp('getGPPData', (data) => {
              if (data && data.parsedSections) {
                const euSection = data.parsedSections['tcfeuv2'];
                if (euSection) {
                  const purposeConsents = euSection.PurposeConsents;
                  if (purposeConsents && typeof purposeConsents === 'object') {
                    const hasConsent = purposeConsents[1] === true || purposeConsents[4] === true;
                    sendStatusToExtension(hasConsent ? 'accepted' : 'rejected', 'IAB_GPP', 'useractioncomplete');
                  }
                } else {
                  sendStatusToExtension('rejected', 'IAB_GPP', 'useractioncomplete');
                }
              }
            });
            return;
          }
        }
        if (status !== 'unknown') {
          sendStatusToExtension(status, 'IAB_GPP', 'tcloaded');
        }
      });
      gppListenerRegistered = true;
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error registering IAB GPP listener:', err);
      return false;
    }
  }

  // ─── 3. USPAPI (CCPA - US Standard) ──────────────────────────────────────
  function checkUsp() {
    if (typeof window.__uspapi !== 'function') return false;
    try {
      window.__uspapi('getUSPData', 1, (uspData, success) => {
        if (!success || !uspData || !uspData.uspString) return;
        const optOutChar = uspData.uspString[2];
        let status = 'unknown';
        if (optOutChar === 'Y') status = 'rejected';
        else if (optOutChar === 'N') status = 'accepted';
        else if (optOutChar === '-') status = 'not_applicable';
        sendStatusToExtension(status, 'USPAPI', 'tcloaded');
      });
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking USPAPI:', err);
      return false;
    }
  }

  // ─── 4. Cookiebot (Cybot) ────────────────────────────────────────────────
  function checkCookiebot() {
    if (typeof window.Cookiebot === 'undefined') return false;
    try {
      const cb = window.Cookiebot;
      if (cb.hasResponse) {
        const accepted = cb.consent && (cb.consent.marketing || cb.consent.statistics);
        sendStatusToExtension(accepted ? 'accepted' : 'rejected', 'Cookiebot', 'tcloaded');
      }
      // Listen for future events
      window.addEventListener('CookiebotOnAccept', () =>
        sendStatusToExtension('accepted', 'Cookiebot', 'useractioncomplete'), { once: false });
      window.addEventListener('CookiebotOnDecline', () =>
        sendStatusToExtension('rejected', 'Cookiebot', 'useractioncomplete'), { once: false });
      window.addEventListener('CookiebotOnConsentReady', () => {
        const cb2 = window.Cookiebot;
        if (!cb2 || !cb2.hasResponse) return;
        const accepted2 = cb2.consent && (cb2.consent.marketing || cb2.consent.statistics);
        sendStatusToExtension(accepted2 ? 'accepted' : 'rejected', 'Cookiebot', 'tcloaded');
      }, { once: false });
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking Cookiebot:', err);
      return false;
    }
  }

  // ─── 5. Google Consent Mode v2 ────────────────────────────────────────────
  function checkGoogleConsentMode() {
    try {
      const dl = window.dataLayer;
      if (!Array.isArray(dl)) return false;
      // Look for gtag consent default/update calls in dataLayer
      for (let i = dl.length - 1; i >= 0; i--) {
        const entry = dl[i];
        if (!entry || typeof entry !== 'object') continue;
        // Standard gtag consent push: ['consent', 'default'/'update', {...}]
        if (Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'update') {
          const consentObj = entry[2];
          if (consentObj) {
            const analyticsConsent = consentObj.analytics_storage;
            const adConsent = consentObj.ad_storage;
            if (analyticsConsent === 'granted' || adConsent === 'granted') {
              sendStatusToExtension('accepted', 'Google_ConsentMode', 'useractioncomplete');
              return true;
            } else if (analyticsConsent === 'denied' && adConsent === 'denied') {
              sendStatusToExtension('rejected', 'Google_ConsentMode', 'useractioncomplete');
              return true;
            }
          }
        }
      }
      // Hook future dataLayer.push calls to observe consent updates
      const origPush = dl.push.bind(dl);
      dl.push = function (...args) {
        for (const arg of args) {
          if (Array.isArray(arg) && arg[0] === 'consent' && arg[1] === 'update') {
            const co = arg[2];
            if (co) {
              const granted = co.analytics_storage === 'granted' || co.ad_storage === 'granted';
              const denied = co.analytics_storage === 'denied' && co.ad_storage === 'denied';
              if (granted) sendStatusToExtension('accepted', 'Google_ConsentMode', 'useractioncomplete');
              else if (denied) sendStatusToExtension('rejected', 'Google_ConsentMode', 'useractioncomplete');
            }
          }
        }
        return origPush(...args);
      };
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking Google Consent Mode:', err);
      return false;
    }
  }

  // ─── 6. Quantcast Choice ──────────────────────────────────────────────────
  function checkQuantcast() {
    if (typeof window.__cmp !== 'function') return false;
    try {
      window.__cmp('getConsentData', null, (consentData, success) => {
        if (!success || !consentData) return;
        const accepted = consentData.consentData && consentData.gdprApplies;
        if (consentData.gdprApplies === false) {
          sendStatusToExtension('not_applicable', 'Quantcast_CMP', 'tcloaded');
        } else {
          // If consentData string exists and is non-empty, user has made a choice
          const hasConsented = consentData.consentData && consentData.consentData.length > 10;
          sendStatusToExtension(hasConsented ? 'accepted' : 'unknown', 'Quantcast_CMP', 'tcloaded');
        }
      });
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking Quantcast CMP:', err);
      return false;
    }
  }

  // ─── 7. OneTrust ─────────────────────────────────────────────────────────
  function checkOneTrust() {
    if (typeof window.OneTrust === 'undefined' && typeof window.OnetrustActiveGroups === 'undefined') return false;
    try {
      if (window.OneTrust && typeof window.OneTrust.OnConsentChanged === 'function') {
        window.OneTrust.OnConsentChanged((e) => {
          const groups = (window.OnetrustActiveGroups || '').split(',').filter(Boolean);
          // C0004 = Targeting/Advertising, C0002 = Performance/Analytics
          const hasTracking = groups.includes('C0004') || groups.includes('C0002');
          sendStatusToExtension(hasTracking ? 'accepted' : 'rejected', 'OneTrust', 'useractioncomplete');
        });
      }
      // Also read current state
      if (window.OnetrustActiveGroups !== undefined) {
        const groups = (window.OnetrustActiveGroups || '').split(',').filter(Boolean);
        const hasTracking = groups.includes('C0004') || groups.includes('C0002');
        
        const isClosed = (window.OneTrust && typeof window.OneTrust.IsAlertBoxClosed === 'function') 
          ? window.OneTrust.IsAlertBoxClosed() 
          : true;
          
        if (!isClosed) {
          sendStatusToExtension('unknown', 'OneTrust', 'tcloaded');
        } else if (groups.length > 0) {
          sendStatusToExtension(hasTracking ? 'accepted' : 'rejected', 'OneTrust', 'tcloaded');
        }
      }
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking OneTrust:', err);
      return false;
    }
  }

  // ─── 8. Didomi ───────────────────────────────────────────────────────────
  function checkDidomi() {
    if (typeof window.Didomi === 'undefined') return false;
    try {
      const didomi = window.Didomi;
      if (didomi.getUserStatus) {
        const status = didomi.getUserStatus();
        const shouldCollect = didomi.shouldConsentBeCollected ? didomi.shouldConsentBeCollected() : true;
        
        if (shouldCollect) {
          sendStatusToExtension('unknown', 'Didomi', 'tcloaded');
        } else if (status) {
          const purposes = status.purposes;
          const hasConsent = purposes && purposes.consent && purposes.consent.enabled && purposes.consent.enabled.length > 0;
          sendStatusToExtension(hasConsent ? 'accepted' : 'rejected', 'Didomi', 'tcloaded');
        }
      }
      window.addEventListener('didomi:consent.changed', (e) => {
        const purposes = e.detail && e.detail.user_status && e.detail.user_status.purposes;
        const hasConsent = purposes && purposes.consent && purposes.consent.enabled && purposes.consent.enabled.length > 0;
        sendStatusToExtension(hasConsent ? 'accepted' : 'rejected', 'Didomi', 'useractioncomplete');
      });
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking Didomi:', err);
      return false;
    }
  }

  // ─── 9. Usercentrics ─────────────────────────────────────────────────────
  function checkUsercentrics() {
    if (typeof window.UC_UI === 'undefined') return false;
    try {
      window.addEventListener('UC_UI_CMP_EVENT', (e) => {
        if (!e.detail) return;
        const { type } = e.detail;
        if (type === 'ACCEPT_ALL') sendStatusToExtension('accepted', 'Usercentrics', 'useractioncomplete');
        else if (type === 'DENY_ALL' || type === 'SAVE') {
          sendStatusToExtension('rejected', 'Usercentrics', 'useractioncomplete');
        }
      });
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking Usercentrics:', err);
      return false;
    }
  }

  // ─── 10. Sourcepoint (message-based CMP) ──────────────────────────────────
  function checkSourcepoint() {
    if (typeof window._sp_ === 'undefined') return false;
    try {
      const sp = window._sp_;
      if (sp.config) {
        // Listen for Sourcepoint consent events
        window.addEventListener('message', (e) => {
          try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (!data || !data.name) return;
            if (data.name === 'sp.consentGiven') {
              sendStatusToExtension('accepted', 'Sourcepoint', 'useractioncomplete');
            } else if (data.name === 'sp.privacyManagerAction' || data.name === 'sp.rejectAll') {
              sendStatusToExtension('rejected', 'Sourcepoint', 'useractioncomplete');
            }
          } catch (_) {}
        });
      }
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking Sourcepoint:', err);
      return false;
    }
  }

  // ─── 11. TrustArc / TRUSTe ───────────────────────────────────────────────
  function checkTrustArc() {
    if (typeof window.truste === 'undefined' && typeof window.TRUSTe === 'undefined') return false;
    try {
      const t = window.truste || window.TRUSTe;
      if (t && t.eu && t.eu.bindMap) {
        // TrustArc exposes consent state via this object
        const consent = t.eu.bindMap.prefCookieSet;
        if (consent !== undefined) {
          sendStatusToExtension(consent === '1' ? 'accepted' : 'rejected', 'TrustArc', 'tcloaded');
        }
      }
      return true;
    } catch (err) {
      console.error('[GDPR Audit] Error checking TrustArc:', err);
      return false;
    }
  }

  // ─── Main init function ───────────────────────────────────────────────────
  function initConsentListeners() {
    let detected = false;
    if (checkTcf()) detected = true;
    if (checkGpp()) detected = true;
    if (checkUsp()) detected = true;
    if (checkCookiebot()) detected = true;
    if (checkOneTrust()) detected = true;
    if (checkDidomi()) detected = true;
    if (checkUsercentrics()) detected = true;
    if (checkSourcepoint()) detected = true;
    if (checkTrustArc()) detected = true;
    if (checkQuantcast()) detected = true;
    if (checkGoogleConsentMode()) detected = true;
    return detected;
  }

  // ─── Polling loop ─────────────────────────────────────────────────────────
  const interval = setInterval(() => {
    attempts++;
    initConsentListeners();
    if (attempts >= MAX_POLLING_ATTEMPTS) {
      clearInterval(interval);
      if (!lastSource) {
        sendStatusToExtension('unknown', null, null);
      }
    }
  }, POLLING_INTERVAL);

  // ─── CCPA periodic re-poll (no standard change event) ────────────────────
  setInterval(() => {
    if (tcfListenerRegistered) return;
    checkUsp();
  }, 3000);

})();
