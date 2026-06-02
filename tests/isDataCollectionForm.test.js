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

// Evaluate storage-helper.js first as content.js depends on it
const storageHelperCode = fs.readFileSync(path.resolve(__dirname, '../storage-helper.js'), 'utf8');
eval(storageHelperCode);

// Evaluate content.js to populate global function definitions
const contentCode = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8');
eval(contentCode);

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
});
