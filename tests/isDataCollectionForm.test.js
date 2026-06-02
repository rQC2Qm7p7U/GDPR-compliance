/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

// Mock Chrome runtime API needed on content script load
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() }
  }
};

// Evaluate all content scripts in a combined block so they share the same scope
const storageHelperCode = fs.readFileSync(path.resolve(__dirname, '../storage-helper.js'), 'utf8');
const constantsCode = fs.readFileSync(path.resolve(__dirname, '../content-constants.js'), 'utf8');
const domUtilsCode = fs.readFileSync(path.resolve(__dirname, '../content-dom-utils.js'), 'utf8');
const policyScannerCode = fs.readFileSync(path.resolve(__dirname, '../content-policy-scanner.js'), 'utf8');
const formScannerCode = fs.readFileSync(path.resolve(__dirname, '../content-form-scanner.js'), 'utf8');
const cmpScannerCode = fs.readFileSync(path.resolve(__dirname, '../content-cmp-scanner.js'), 'utf8');
const contentCode = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8');

const combinedCode = [
  storageHelperCode,
  constantsCode,
  domUtilsCode,
  policyScannerCode,
  formScannerCode,
  cmpScannerCode,
  contentCode
].join('\n');

eval(combinedCode);

describe('isDataCollectionForm test suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should classify newsletter, registration, contact, and login forms as data collection', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Subscribe to our Newsletter</h3>
      <input type="text" name="name" />
      <button type="submit">Submit</button>
    `;
    expect(isDataCollectionForm(form)).toBe(true);

    const contactForm = document.createElement('form');
    contactForm.innerHTML = `
      <h3>Contact Us</h3>
      <textarea name="message"></textarea>
      <button type="submit">Send</button>
    `;
    expect(isDataCollectionForm(contactForm)).toBe(true);
  });

  test('should classify forms collecting personal inputs as data collection', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="email" name="user_email" />
      <button type="submit">Submit</button>
    `;
    expect(isDataCollectionForm(form)).toBe(true);
  });

  test('should ignore forms classified as search or filter', () => {
    // Standard search form
    const searchForm1 = document.createElement('form');
    searchForm1.setAttribute('role', 'search');
    searchForm1.innerHTML = `
      <input type="text" name="q" placeholder="Search..." />
      <button type="submit">Go</button>
    `;
    expect(isDataCollectionForm(searchForm1)).toBe(false);

    // Search filter form with checkboxes (like on mobile.de)
    const filterForm = document.createElement('form');
    filterForm.setAttribute('class', 'car-search-filter');
    filterForm.setAttribute('action', '/suche');
    filterForm.innerHTML = `
      <select name="make"><option>BMW</option></select>
      <input type="checkbox" name="damaged" /> Damaged Vehicles
      <input type="checkbox" name="vat" /> VAT Deductible
      <button type="submit">Show Results</button>
    `;
    expect(isDataCollectionForm(filterForm)).toBe(false);
  });

  test('should NOT ignore search forms if they collect email or password', () => {
    const suspiciousSearch = document.createElement('form');
    suspiciousSearch.setAttribute('role', 'search');
    suspiciousSearch.innerHTML = `
      <input type="email" name="email" />
      <input type="password" name="password" />
      <button type="submit">Find Account</button>
    `;
    expect(isDataCollectionForm(suspiciousSearch)).toBe(true);
  });
});

describe('checkFormPolicyLink test suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should return no_forms if there are no forms', () => {
    expect(checkFormPolicyLink('https://example.com/privacy')).toBe('no_forms');
  });

  test('should return true if form has an <a> link with privacy keyword', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Subscribe</h3>
      <input type="email" name="email" />
      <a href="https://example.com/privacy-policy">Privacy Rules</a>
      <button type="submit">Submit</button>
    `;
    document.body.appendChild(form);
    expect(checkFormPolicyLink('https://example.com/privacy-policy')).toBe(true);
  });

  test('should return true if form has a button role=link matching placeholder comment', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Subscribe</h3>
      <input type="email" name="email" />
      <button role="link" type="button">Datenschutz</button>
      <button type="submit">Submit</button>
    `;
    document.body.appendChild(form);
    const placeholder = 'javascript:void(0)/*' + encodeURIComponent('datenschutz') + '*/';
    expect(checkFormPolicyLink(placeholder)).toBe(true);
  });
});

describe('checkPolicyInFooter test suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should return true if privacy link is inside a footer element', () => {
    const footer = document.createElement('footer');
    footer.innerHTML = `
      <button role="link" type="button">Datenschutz</button>
    `;
    document.body.appendChild(footer);
    const placeholder = 'javascript:void(0)/*' + encodeURIComponent('datenschutz') + '*/';
    expect(checkPolicyInFooter(placeholder)).toBe(true);
  });

  test('should return true if privacy link is at the bottom 20% of the document', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <button role="link" type="button">Datenschutz</button>
    `;
    document.body.appendChild(div);

    // Mock getBoundingClientRect and document height
    const btn = div.querySelector('button');
    btn.getBoundingClientRect = () => ({
      top: 900,
      bottom: 920,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
    });
    
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, writable: true, configurable: true });
    
    const placeholder = 'javascript:void(0)/*' + encodeURIComponent('datenschutz') + '*/';
    expect(checkPolicyInFooter(placeholder)).toBe(true);
  });

  test('should return true if privacy link is inside a container with class or ID containing footer keywords', () => {
    const customFooter = document.createElement('div');
    customFooter.className = 'page-footer-container';
    customFooter.innerHTML = `
      <a href="https://example.com/privacy">Privacy Policy</a>
    `;
    document.body.appendChild(customFooter);
    expect(checkPolicyInFooter('https://example.com/privacy')).toBe(true);

    const bottomLinks = document.createElement('div');
    bottomLinks.id = 'bottom-links-section';
    bottomLinks.innerHTML = `
      <a href="https://example.com/privacy">Privacy Policy</a>
    `;
    document.body.appendChild(bottomLinks);
    expect(checkPolicyInFooter('https://example.com/privacy')).toBe(true);
  });
});

describe('scanPrivacyPolicy test suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should find policy by visible text', () => {
    const link = document.createElement('a');
    link.href = 'https://example.com/privacy';
    link.textContent = 'Privacy Policy';
    document.body.appendChild(link);
    expect(scanPrivacyPolicy()).toBe('https://example.com/privacy');
  });

  test('should find policy by aria-label if text is empty', () => {
    const link = document.createElement('a');
    link.href = 'https://example.com/privacy';
    link.setAttribute('aria-label', 'privacy disclosures');
    document.body.appendChild(link);
    expect(scanPrivacyPolicy()).toBe('https://example.com/privacy');
  });

  test('should find policy by image alt text inside the link', () => {
    const link = document.createElement('a');
    link.href = 'https://example.com/privacy';
    link.innerHTML = '<img alt="datenschutzerklärung" src="icon.png" />';
    document.body.appendChild(link);
    expect(scanPrivacyPolicy()).toBe('https://example.com/privacy');
  });

  test('should find policy by title attribute if text is empty', () => {
    const link = document.createElement('a');
    link.href = 'https://example.com/privacy';
    link.setAttribute('title', 'legal notice');
    document.body.appendChild(link);
    expect(scanPrivacyPolicy()).toBe('https://example.com/privacy');
  });

  test('should find policy by href-based keyword match even if text has no keyword', () => {
    const link = document.createElement('a');
    link.href = 'https://example.com/legal-notice.html';
    link.textContent = 'General Rules';
    document.body.appendChild(link);
    expect(scanPrivacyPolicy()).toBe('https://example.com/legal-notice.html');
  });
});
