/**
 * GDPR Consent Auditor - Storage Snapshot & Delta Utilities
 */

// Check if the extension context is still valid (not invalidated by a reload/update)
function isContextValid() {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
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

function takeStorageSnapshot() {
  const snapshot = {
    cookies: {},
    localStorage: {},
    sessionStorage: {}
  };

  // 1. Capture cookies
  try {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const idx = c.indexOf('=');
      if (idx !== -1) {
        const name = c.substring(0, idx).trim();
        const value = c.substring(idx + 1).trim();
        if (name) {
          snapshot.cookies[name] = value;
        }
      }
    }
  } catch (e) {
    console.warn('[GDPR Audit] Failed to read cookies for snapshot:', e);
  }

  // 2. Capture localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      snapshot.localStorage[key] = localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('[GDPR Audit] Failed to read localStorage for snapshot:', e);
  }

  // 3. Capture sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      snapshot.sessionStorage[key] = sessionStorage.getItem(key);
    }
  } catch (e) {
    console.warn('[GDPR Audit] Failed to read sessionStorage for snapshot:', e);
  }

  return snapshot;
}

function computeStorageDelta(before, after) {
  const delta = [];
  const types = ['cookies', 'localStorage', 'sessionStorage'];

  for (const type of types) {
    const beforeObj = before[type] || {};
    const afterObj = after[type] || {};

    // Check for added or changed keys
    for (const key of Object.keys(afterObj)) {
      const beforeVal = beforeObj[key];
      const afterVal = afterObj[key];

      if (beforeVal === undefined) {
        delta.push({
          type,
          action: 'added',
          key,
          value: afterVal
        });
      } else if (beforeVal !== afterVal) {
        delta.push({
          type,
          action: 'changed',
          key,
          oldValue: beforeVal,
          value: afterVal
        });
      }
    }

    // Check for deleted keys
    for (const key of Object.keys(beforeObj)) {
      if (afterObj[key] === undefined) {
        delta.push({
          type,
          action: 'deleted',
          key,
          oldValue: beforeObj[key]
        });
      }
    }
  }

  return delta;
}

function matchStorageSignature(signature) {
  try {
    if (!signature || !signature.key || typeof signature.key !== 'string' || signature.key.trim().length < 2) {
      return false;
    }
    const { storageType, key, valPattern } = signature;
    let currentVal = null;

    if (storageType === 'cookie') {
      const cookies = document.cookie.split(';');
      for (let c of cookies) {
        const idx = c.indexOf('=');
        if (idx !== -1) {
          const name = c.substring(0, idx).trim();
          if (name === key) {
            currentVal = decodeURIComponent(c.substring(idx + 1).trim());
            break;
          }
        }
      }
    } else if (storageType === 'local') {
      currentVal = localStorage.getItem(key);
    } else if (storageType === 'session') {
      currentVal = sessionStorage.getItem(key);
    }

    if (currentVal !== null) {
      const cleanVal = currentVal.toLowerCase();
      const cleanPattern = valPattern.toLowerCase();
      return cleanVal.includes(cleanPattern);
    }
  } catch (e) {
    console.warn('[GDPR Audit] Error matching storage signature:', e);
  }
  return false;
}
