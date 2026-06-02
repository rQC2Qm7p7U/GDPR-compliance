/**
 * GDPR Consent Auditor - Cookie Scanner & Badge Utilities
 */

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
