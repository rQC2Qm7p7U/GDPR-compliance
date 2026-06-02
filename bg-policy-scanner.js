/**
 * GDPR Consent Auditor - Background Policy Fetch & Analysis
 */

const fetchedPolicyUrls = new Set();

function stripHtml(htmlText) {
  if (!htmlText) return '';
  // Remove script and style tags completely
  let text = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  // Strip general HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  return text;
}

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

async function runBackgroundPolicyScan(tabId, url) {
  if (fetchedPolicyUrls.has(url)) return;
  fetchedPolicyUrls.add(url);

  try {
    console.log(`[GDPR Audit] Background fetching privacy policy page for CORS bypass: ${url}`);
    
    // In MV3 background service workers we fetch with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, { signal: controller.signal });
    const textData = await response.text();
    clearTimeout(timeoutId);

    const plainText = stripHtml(textData);
    const scanResults = scanPrivacyPolicyText(plainText);
    
    console.log(`[GDPR Audit] Background scan successful for ${url}:`, scanResults);

    // Save scan results directly to active tab state
    const state = await getTabState(tabId);
    state.policyDeepScan = scanResults;
    await saveTabState(tabId, state);

  } catch (err) {
    console.warn(`[GDPR Audit] Background privacy policy scan failed for ${url}:`, err.message);
    fetchedPolicyUrls.delete(url); // Allow retry if requested later
  }
}
