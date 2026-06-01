# Chrome Web Store Listing — GDPR/CCPA Cookie Consent Auditor

> Last Updated: 2026-06-01

## Store Listing

**Extension Name**
GDPR/CCPA Cookie Consent Auditor

**Short Description**
Audits websites for privacy compliance by checking if tracking scripts load before or after consent rejection.

**Detailed Description**
GDPR/CCPA Cookie Consent Auditor is a premium utility designed for developers, privacy officers, and security auditors to test and validate cookie consent banner integrations on any website. 

Modern privacy laws like GDPR (Europe) and CCPA (United States) require website owners to block third-party tracking scripts until the user gives explicit consent (pre-consent phase) or if they opt-out. Unfortunately, many tracking scripts load before the banner is clicked, leading to severe compliance violations.

This extension intercepts background network traffic and scans local storage cookies in real-time. It checks if trackers like Google Analytics, Facebook Pixel, TikTok Pixel, Hotjar, and HubSpot load illegally, and determines whether they comply with global CMP standards (IAB TCF v2.2 and USPAPI).

Key Features:
- Real-time request auditing: Captures third-party tracking scripts loaded in the background.
- Cookie scanner: Identifies tracker cookies initialized before consent or after rejection.
- CMP Standards Detection: Hooks into IAB Transparency and Consent Framework (TCF v2.2) and CCPA USPAPI to read active consent state.
- Interactive Dashboard: Displays violations labeled by type (Pre-Consent or Post-Rejection) with initiator details and timestamps.
- Zero-leak architecture: Uses modern Manifest V3 session storage to clean up states when tabs are closed.
- Export Audit: Save reports as JSON files for compliance logging and developers.

How to use:
1. Load any website with a consent banner.
2. Open the extension popup to view active domain status.
3. Observe violations count. Refresh the page via the "Reset" button to run a clean start-to-finish audit.
4. Export the report to share with your engineering team.

Privacy & Security Note:
This extension runs entirely on your local machine. It does not collect, track, or transmit any user behavior or page content. No telemetry is gathered, and no data is shared with third parties.

**Category**
Developer Tools

**Single Purpose**
Audits web page tracking scripts and cookies for GDPR/CCPA consent compliance.

**Primary Language**
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created (Default browser puzzle icon used) | |
| Screenshot 1 [REQUIRED] | 1280×800 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `webRequest` | permissions | Required to observe background network requests to match outgoing scripts against known third-party tracking domains. |
| `storage` | permissions | Required to access `chrome.storage.session` for caching tab-specific violation states without writing to disk or persisting telemetry. |
| `cookies` | permissions | Required to read cookies set on the audited web page to check if tracking identifiers are present before user consent. |
| `tabs` | permissions | Required to query the active tab domain to associate violations with the correct site and write the badge text indicator. |
| `http://*/*`, `https://*/*` | host_permissions | Required to intercept tracking requests and check CMP API status on the sites that the developer chooses to audit. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL**
https://github.com/privacy-compliance/cookie-consent-auditor/blob/main/PRIVACY.md (Placeholder: Provide live repository link during store submission)


## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free


## Developer Info

**Publisher Name**
Privacy Tools Dev

**Contact Email**
developer@example.com

**Support URL / Email**
https://github.com/privacy-compliance/cookie-consent-auditor/issues


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-01 | Initial release with IAB TCF v2.2 & USPAPI support, request intercept auditing, cookie scanning, and JSON report export. | Draft |


## Review Notes

### Known Issues / Limitations
- Does not block scripts (audits only).
- Requires host permissions to interact with `window.__tcfapi` and read cookies.
