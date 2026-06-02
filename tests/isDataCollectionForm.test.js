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
