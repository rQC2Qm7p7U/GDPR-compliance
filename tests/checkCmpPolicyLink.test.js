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
].join('\n')
  .replace('let lastCmpBannerElement = null;', 'global.lastCmpBannerElement = null;');

eval(combinedCode);

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
