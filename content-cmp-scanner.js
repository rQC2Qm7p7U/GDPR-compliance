// CMP banner scanner with Shadow DOM + iframe support
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
      // Optimization: Heuristic fallback banners are loaded in light DOM, so we can avoid scanning nested shadow DOMs recursively
      const allElements = document.querySelectorAll('*');
      
      for (let el of allElements) {
        if (!el || el === document.body || el === document.documentElement) {
          continue;
        }
        
        const tagName = el.tagName.toUpperCase();
        // Skip document structures and non-interactive formatting/script elements
        const IGNORED_BANNER_TAGS = ['HTML', 'BODY', 'MAIN', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'FORM', 'SCRIPT', 'STYLE', 'IFRAME', 'NOSCRIPT', 'HEAD', 'META', 'LINK'];
        if (IGNORED_BANNER_TAGS.includes(tagName)) {
          continue;
        }
        
        let cheapScore = 0;
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
            if (finalScore >= 14 && finalScore > maxScore) {
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
                       window.location.href.includes('cmp.');
    if (isCmpFrame && document.body) {
      banner = document.body;
    }
  }

  if (banner) {
    lastCmpBannerElement = banner;
  } else {
    lastCmpBannerElement = null;
  }

  if (!banner) return 'no_cmp';

  // Find clickable elements (including Shadow DOM)
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

// Check for privacy policy / imprint links inside CMP banner
function checkCmpPolicyLink() {
  if (!lastCmpBannerElement) return 'no_cmp';
  
  const links = querySelectorAllDeep('a', lastCmpBannerElement);
  if (links.length === 0) return false;
  
  const privacyKeywords = [
    'privacy', 'datenschutz', 'confidentialite', 'privacidad', 'regulamin',
    'imprint', 'impressum', 'cookie', 'legal', 'datenschutzerklärung',
    'terms', 'conditions', 'zastita', 'kolačići', 'polise', 'politika',
    'richtlinie', 'declaration'
  ];
  
  for (let link of links) {
    const href = link.getAttribute('href');
    const text = (link.textContent || '').toLowerCase().trim();
    if (href) {
      const hrefLower = href.toLowerCase();
      if (privacyKeywords.some(kw => hrefLower.includes(kw) || text.includes(kw))) {
        return true;
      }
    }
  }
  return false;
}
