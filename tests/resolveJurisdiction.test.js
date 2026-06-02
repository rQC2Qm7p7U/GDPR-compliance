const fs = require('fs');
const path = require('path');

// Mock browser APIs and globals before evaluating background.js
global.chrome = {
  webRequest: {
    onBeforeRequest: { addListener: jest.fn() },
    onHeadersReceived: { addListener: jest.fn() }
  },
  tabs: {
    onUpdated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  storage: {
    local: { get: jest.fn(), set: jest.fn() },
    session: { get: jest.fn(), set: jest.fn(), remove: jest.fn() }
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    getURL: jest.fn().mockReturnValue('mock-url')
  },
  alarms: {
    onAlarm: { addListener: jest.fn() }
  },
  sidePanel: {
    setPanelBehavior: jest.fn().mockImplementation(() => Promise.resolve())
  }
};
global.userCountryCode = 'US';

// Load background.js functions into global scope
// Mock importScripts, replace block-scoped userCountryCode with global scope, and disable auto-run side effects
global.importScripts = jest.fn();
const bgCode = fs.readFileSync(path.resolve(__dirname, '../background.js'), 'utf8')
  .replace('let userCountryCode = null;', 'global.userCountryCode = null;')
  .replace('checkUserLocation();', '// checkUserLocation();')
  .replace('loadTrackers();', '// loadTrackers();');
eval(bgCode);

describe('resolveJurisdiction test suite', () => {
  test('should return strict override jurisdictions if auditMode is set', () => {
    expect(resolveJurisdiction('https://example.com', null, 'gdpr')).toBe('GDPR');
    expect(resolveJurisdiction('https://example.com', null, 'ccpa')).toBe('CCPA');
    expect(resolveJurisdiction('https://example.com', null, 'zzpl')).toBe('ZZPL');
  });

  test('should detect Montenegro ZZPL from hostname ending in .me', () => {
    global.userCountryCode = 'US';
    expect(resolveJurisdiction('https://visit-montenegro.me', null, 'auto')).toBe('ZZPL');
    expect(resolveJurisdiction('https://visit-montenegro.me/path?q=1', 'en', 'auto')).toBe('ZZPL');
  });

  test('should detect Montenegro ZZPL if user country code is ME', () => {
    global.userCountryCode = 'ME';
    expect(resolveJurisdiction('https://google.com', null, 'auto')).toBe('ZZPL');
  });

  test('should detect Montenegro ZZPL from Balkan languages (sr, hr, bs, me)', () => {
    global.userCountryCode = 'US';
    expect(resolveJurisdiction('https://google.com', 'sr-RS', 'auto')).toBe('ZZPL');
    expect(resolveJurisdiction('https://google.com', 'hr', 'auto')).toBe('ZZPL');
    expect(resolveJurisdiction('https://google.com', 'bs-BA', 'auto')).toBe('ZZPL');
    expect(resolveJurisdiction('https://google.com', 'me-ME', 'auto')).toBe('ZZPL');
  });

  test('should return null for other sites by default', () => {
    global.userCountryCode = 'US';
    expect(resolveJurisdiction('https://google.com', 'en-US', 'auto')).toBeNull();
    expect(resolveJurisdiction('https://mobile.de', 'de-DE', 'auto')).toBeNull();
  });
});
