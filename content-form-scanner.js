function isDataCollectionForm(form) {
  const action = (form.getAttribute('action') || '').toLowerCase();
  const id = (form.getAttribute('id') || '').toLowerCase();
  const className = (form.getAttribute('class') || '').toLowerCase();
  const role = (form.getAttribute('role') || '').toLowerCase();

  // 1. Identify search/filter forms and exclude them from privacy policy requirements
  const isSearchForm = role === 'search' || 
                       action.includes('search') || action.includes('suche') || action.includes('find') ||
                       id.includes('search') || id.includes('suche') ||
                       className.includes('search') || className.includes('suche') ||
                       className.includes('filter');

  if (isSearchForm) {
    // Search/filter forms don't require privacy consent links unless they contain email/password fields
    const hasEmailOrPass = form.querySelector('input[type="email"], input[type="password"], input[name*="email" i], input[name*="pass" i], input[id*="email" i], input[id*="pass" i]');
    if (!hasEmailOrPass) {
      return false;
    }
  }

  const formText = (form.textContent || '').toLowerCase();
  
  const isNewsletter = formText.includes('newsletter') || formText.includes('subscribe') || formText.includes('abonnieren') || formText.includes('подпис') || className.includes('newsletter') || id.includes('newsletter') || className.includes('subscribe') || id.includes('subscribe') || action.includes('subscribe');
  const isContact = formText.includes('contact') || formText.includes('kontakt') || formText.includes('get in touch') || formText.includes('anfrage') || className.includes('contact') || id.includes('contact') || formText.includes('feedback');
  const isRegistration = formText.includes('register') || formText.includes('sign up') || formText.includes('registrieren') || className.includes('register') || id.includes('register') || className.includes('signup') || id.includes('signup') || formText.includes('create account') || formText.includes('anmelden');
  const isLogin = formText.includes('login') || formText.includes('sign in') || className.includes('login') || id.includes('login') || formText.includes('einloggen');
  const isCheckout = formText.includes('checkout') || formText.includes('billing') || formText.includes('payment') || className.includes('checkout') || id.includes('checkout') || formText.includes('kasse');

  if (isNewsletter || isContact || isRegistration || isLogin || isCheckout) return true;

  const inputs = form.querySelectorAll('input, select, textarea');
  let hasPersonalInput = false;
  inputs.forEach(input => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    const name = (input.getAttribute('name') || '').toLowerCase();
    const idAttr = (input.getAttribute('id') || '').toLowerCase();
    const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
    
    const isEmail = type === 'email' || name.includes('email') || idAttr.includes('email') || placeholder.includes('email');
    const isPhone = type === 'tel' || name.includes('phone') || name.includes('tel') || idAttr.includes('phone');
    const isAddress = name.includes('address') || name.includes('street') || name.includes('zip') || name.includes('city') || idAttr.includes('address');
    const isPassword = type === 'password' || name.includes('pass') || idAttr.includes('pass');

    if (isEmail || isPhone || isAddress || isPassword) {
      hasPersonalInput = true;
    }
  });

  return hasPersonalInput;
}

// Pre-checked checkbox detection
function checkFormCheckboxes() {
  const allForms = document.getElementsByTagName('form');
  const forms = Array.from(allForms).filter(isDataCollectionForm);
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

// Form policy link check
function checkFormPolicyLink(policyLink) {
  const allForms = document.getElementsByTagName('form');
  const forms = Array.from(allForms).filter(isDataCollectionForm);
  if (forms.length === 0) return 'no_forms';
  for (let form of forms) {
    const links = form.querySelectorAll('a, button, [role="link"]');
    for (let link of links) {
      const href = link.getAttribute('href') || link.getAttribute('data-href') || link.getAttribute('data-url') || '';
      const text = (link.textContent || '').toLowerCase().trim();
      
      let isMatch = false;
      if (href) {
        if (policyLink && (href.includes(policyLink) || policyLink.includes(href))) {
          isMatch = true;
        }
      }
      if (!isMatch && policyLink && policyLink.includes('/*') && policyLink.includes('*/')) {
        const decodedText = decodeURIComponent(policyLink.split('/*')[1].split('*/')[0]);
        if (text.includes(decodedText) || decodedText.includes(text)) {
          isMatch = true;
        }
      }
      
      if (isMatch) {
        return true;
      }
      
      // Keyword-based match inside the form
      const hrefLower = href.toLowerCase();
      const textLower = text.toLowerCase().trim();
      const privacyKeywords = [
        'privacy', 'datenschutz', 'confidentialite', 'privacidad', 'regulamin',
        'imprint', 'impressum', 'cookie', 'legal', 'datenschutzerklärung',
        'terms', 'conditions', 'zastita', 'kolačići', 'polise', 'politika',
        'richtlinie', 'declaration'
      ];
      
      if (privacyKeywords.some(kw => hrefLower.includes(kw) || textLower.includes(kw))) {
        return true;
      }
    }
  }
  return false;
}

// Form Data Minimization helper
function getLabelText(input) {
  let text = '';
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) text = label.textContent || '';
  }
  if (!text) {
    const parentLabel = input.closest('label');
    if (parentLabel) text = parentLabel.textContent || '';
  }
  return text;
}

function checkDataMinimization() {
  const forms = document.getElementsByTagName('form');
  if (forms.length === 0) return 'no_forms';
  
  let hasMinimizationViolation = 'passed';
  
  for (let form of forms) {
    const formText = (form.textContent || '').toLowerCase();
    const action = (form.getAttribute('action') || '').toLowerCase();
    const id = (form.getAttribute('id') || '').toLowerCase();
    const className = (form.getAttribute('class') || '').toLowerCase();
    
    // Detect if it is a newsletter / subscribe / registration / contact form
    const isNewsletter = formText.includes('newsletter') || formText.includes('subscribe') || formText.includes('abonnieren') || formText.includes('подпис') || className.includes('newsletter') || id.includes('newsletter') || className.includes('subscribe') || id.includes('subscribe') || action.includes('subscribe');
    const isContact = formText.includes('contact') || formText.includes('kontakt') || formText.includes('get in touch') || formText.includes('anfrage') || className.includes('contact') || id.includes('contact');
    const isRegistration = formText.includes('register') || formText.includes('sign up') || formText.includes('registrieren') || className.includes('register') || id.includes('register') || className.includes('signup') || id.includes('signup');

    if (isNewsletter || isContact || isRegistration) {
      let collectsEmail = false;
      let hasRequiredPhone = false;
      let hasRequiredAddress = false;
      let hasRequiredBirthdate = false;
      
      const inputs = form.querySelectorAll('input, select');
      inputs.forEach(input => {
        const type = (input.getAttribute('type') || '').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const idAttr = (input.getAttribute('id') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const labelText = getLabelText(input).toLowerCase();
        
        const isEmail = type === 'email' || name.includes('email') || idAttr.includes('email') || placeholder.includes('email') || placeholder.includes('почт') || labelText.includes('email') || labelText.includes('почт');
        const isPhone = type === 'tel' || name.includes('phone') || name.includes('tel') || name.includes('mobil') || idAttr.includes('phone') || idAttr.includes('tel') || placeholder.includes('phone') || placeholder.includes('tel') || placeholder.includes('телефон') || labelText.includes('phone') || labelText.includes('tel') || labelText.includes('телефон');
        const isAddress = name.includes('address') || name.includes('street') || name.includes('zip') || name.includes('city') || idAttr.includes('address') || idAttr.includes('street') || placeholder.includes('address') || labelText.includes('address') || labelText.includes('strasse') || labelText.includes('straße') || labelText.includes('адрес');
        const isBirthdate = type === 'date' || name.includes('birth') || name.includes('dob') || idAttr.includes('birth') || labelText.includes('birth') || labelText.includes('geburtstag') || labelText.includes('дата рожд');
        
        if (isEmail) collectsEmail = true;
        
        const isRequired = input.hasAttribute('required') || input.getAttribute('aria-required') === 'true';
        if (isRequired) {
          if (isPhone) hasRequiredPhone = true;
          if (isAddress) hasRequiredAddress = true;
          if (isBirthdate) hasRequiredBirthdate = true;
        }
      });
      
      // Violations
      if (isNewsletter && collectsEmail && (hasRequiredPhone || hasRequiredAddress || hasRequiredBirthdate)) {
        hasMinimizationViolation = 'failed';
        break;
      }
      if ((isContact || isRegistration) && collectsEmail && (hasRequiredAddress || hasRequiredBirthdate)) {
        hasMinimizationViolation = 'warning';
      }
    }
  }
  
  return hasMinimizationViolation;
}
