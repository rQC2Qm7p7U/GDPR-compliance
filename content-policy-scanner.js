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

  // We scan both anchors (a) and interactive link elements (button, role="link") to support SPAs like mobile.de
  const links = document.querySelectorAll('a, button, [role="link"]');
  for (let link of links) {
    let text = link.textContent ? link.textContent.toLowerCase().trim() : '';
    if (!text) {
      const ariaLabel = link.getAttribute('aria-label') || '';
      const title = link.getAttribute('title') || '';
      const img = link.querySelector('img');
      const alt = img ? img.getAttribute('alt') || '' : '';
      text = (ariaLabel + ' ' + title + ' ' + alt).toLowerCase().trim();
    }
    
    let href = link.getAttribute('href') || link.getAttribute('data-href') || link.getAttribute('data-url') || '';
    const matchesKeyword = keywords.some(keyword => text.includes(keyword));
    
    let matchesHref = false;
    if (href) {
      const hrefLower = href.toLowerCase();
      const hrefKeywords = [
        'privacy-policy', 'privacypolicy', 'privacy_policy', '/privacy',
        'datenschutz', 'impressum', 'cookie-policy', 'cookiepolicy', 'cookie_policy',
        'legal-notice', 'legalnotice', 'legal_notice', '/legal', '/cookie', '/terms'
      ];
      matchesHref = hrefKeywords.some(kw => hrefLower.includes(kw));
    }

    if (matchesKeyword || matchesHref) {
      if (!href) {
        // Return a dynamic link placeholder using text content
        return 'javascript:void(0)/*' + encodeURIComponent(text || 'privacy') + '*/';
      }
      try {
        return new URL(href, window.location.href).href;
      } catch (e) {
        return href;
      }
    }
  }
  return null;
}

// Check if policy link is inside footer or bottom 20%
function checkPolicyInFooter(policyLink) {
  if (!policyLink) return false;
  const links = document.querySelectorAll('a, button, [role="link"]');
  for (let link of links) {
    const href = link.getAttribute('href') || '';
    let linkText = (link.textContent || '').toLowerCase().trim();
    if (!linkText) {
      const ariaLabel = link.getAttribute('aria-label') || '';
      const title = link.getAttribute('title') || '';
      const img = link.querySelector('img');
      const alt = img ? img.getAttribute('alt') || '' : '';
      linkText = (ariaLabel + ' ' + title + ' ' + alt).toLowerCase().trim();
    }
    
    let isMatch = false;
    if (href && (href.includes(policyLink) || policyLink.includes(href))) {
      isMatch = true;
    } else if (policyLink.includes('/*') && policyLink.includes('*/')) {
      const decodedText = decodeURIComponent(policyLink.split('/*')[1].split('*/')[0]);
      if (linkText.includes(decodedText) || decodedText.includes(linkText)) {
        isMatch = true;
      }
    }

    if (isMatch) {
      let parent = link.parentElement;
      while (parent) {
        const tagName = parent.tagName.toLowerCase();
        if (tagName === 'footer') return true;
        
        const id = (parent.id || '').toLowerCase();
        const className = (typeof parent.className === 'string' ? parent.className : parent.getAttribute('class') || '').toLowerCase();
        const footerKeywords = ['footer', 'bottom-links', 'bottom-nav', 'legal-links'];
        if (footerKeywords.some(kw => id.includes(kw) || className.includes(kw))) {
          return true;
        }
        
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

// Deep privacy policy text analysis
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
