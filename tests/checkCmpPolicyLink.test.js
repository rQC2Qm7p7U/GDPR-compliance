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
// Replace 'let lastCmpBannerElement' with 'global.lastCmpBannerElement' to make it globally settable in test
const contentCode = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8')
  .replace('let lastCmpBannerElement = null;', 'global.lastCmpBannerElement = null;');
eval(contentCode);

describe('checkCmpPolicyLink test suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset global banner element from content.js
    lastCmpBannerElement = null;
  });

  test('should return no_cmp if lastCmpBannerElement is not set', () => {
    expect(checkCmpPolicyLink()).toBe('no_cmp');
  });

  test('should return true if banner contains privacy policy or imprint link', () => {
    const dialog = document.createElement('dialog');
    dialog.id = 'mde-consent-modal-dialog';
    dialog.innerHTML = `
      <h2>We value your privacy</h2>
      <button>Accept All</button>
      <div>
        <a href="https://www.mobile.de/service/imprint">Impressum</a>
        <a href="https://www.mobile.de/service/privacyPolicy">Datenschutz</a>
      </div>
    `;
    document.body.appendChild(dialog);
    lastCmpBannerElement = dialog;

    expect(checkCmpPolicyLink()).toBe(true);
  });

  test('should return false if banner has no privacy links', () => {
    const dialog = document.createElement('dialog');
    dialog.id = 'mock-banner';
    dialog.innerHTML = `
      <h2>Cookie Consent</h2>
      <button>OK</button>
      <a href="https://example.com/cars/bmw">Select BMW</a>
    `;
    document.body.appendChild(dialog);
    lastCmpBannerElement = dialog;

    expect(checkCmpPolicyLink()).toBe(false);
  });
});
