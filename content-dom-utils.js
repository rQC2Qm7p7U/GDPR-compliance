// Shadow DOM aware element search
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
    if (root.shadowRoot) {
      results.push(...querySelectorAllDeep(selector, root.shadowRoot));
    }
    const allElements = root.querySelectorAll('*');
    for (let el of allElements) {
      const tagName = el.tagName.toUpperCase();
      // Only inspect tags that are specification-allowed to host shadow DOM
      const canHostShadow = tagName.includes('-') || [
        'DIV', 'SPAN', 'ARTICLE', 'ASIDE', 'BODY', 'SECTION', 'MAIN', 'FOOTER', 'HEADER', 'NAV'
      ].includes(tagName);
      if (canHostShadow && el.shadowRoot) {
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
