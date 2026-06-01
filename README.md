# GDPR & CCPA Consent Compliance Auditor

A lightweight Manifest V3 Chrome Extension that audits websites in real-time for compliance with GDPR, CCPA, and cookie consent regulations. 

The extension checks if tracking scripts, analytics, and marketing tags load before the user interacts with the consent banner (pre-consent blocking violations) or after they explicitly select to reject all cookies (post-rejection tracking violations).

---

## 🎨 Icon Design

The extension features a clean, minimalist flat icon concept:

<p align="center">
  <img src="icons/icon128.png" alt="GDPR Consent Auditor Logo" width="128" height="128">
</p>

---

## ✨ Features

- **Universal CMP Banner Detection**: Uses an optimized, two-phase weighted scoring heuristic to detect consent overlays (OneTrust, Cookiebot, Usercentrics, Didomi, Sourcepoint, etc.) across any website.
- **Shadow DOM & Iframe Support**: Recursively traverses shadow roots and injected frames to locate banner elements and interactive buttons.
- **Accurate Button Identification**: Maps custom tags (`<sp-button>`, `<uc-button>`) and elements with custom classes/IDs to Accept/Reject terms across 20+ languages.
- **Pre-Consent & Post-Rejection Violations Auditor**: Intercepts outgoing HTTP network requests and tracks cookies to register non-compliant trackers before consent or after opt-out.
- **Self-Learning Consent Storage Signatures**: Automatically captures local storage, session storage, and cookie changes on user consent action, indexing site signatures for immediate detection on subsequent page loads.
- **Online Rules Database Updater**: Downloads the latest tracker list (DuckDuckGo Tracker Blocklist) and CMP selectors (Consent-O-Matic rules) every 7 days automatically in the background.

---

## 🏗️ Architecture

```
GDPR/CCPA Consent Compliance Auditor
├── manifest.json            (Extension Configuration)
├── background.js            (Service Worker: intercepts requests, updates rules, saves snapshots)
├── rules-updater.js         (Downloads/caches Consent-O-Matic CMP & DDG Tracker rules)
├── storage-helper.js        (Captures and compares cookies/storage snapshots for learning)
├── content.js               (Main DOM Scanner: scores banners, extracts buttons, intercepts clicks)
├── main-world-injector.js   (Injected script: interfaces with standard CMP APIs like __tcfapi, UC_UI)
├── icons/                   (Extension branding assets)
└── popup/                   (Auditor SidePanel UI containing compliance metrics & reports)
```

---

## 🚀 Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) installed to package and compile the extension.

### Installation & Build

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/rQC2Qm7p7U/GDPR-compliance.git
   cd GDPR-compliance
   ```

2. Compile the extension and pack it into a `.zip` archive:
   ```bash
   npm run build
   ```
   *This creates a `dist/` folder containing the ready-to-load extension and a packaged `gdpr-ccpa-consent-auditor.zip` archive.*

3. Load the extension in Google Chrome:
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** (top-left button).
   - Select the `dist/` directory generated in step 2.

---

## 🛠️ Verification & Compliance Audit

Once loaded:
1. Click the extension icon to open the **Consent Compliance Auditor** sidebar.
2. Go to any website (e.g. `de.euronews.com` or `mobile.de`).
3. View the compliance indicators:
   - **Consent Status**: Current state of user selection (unknown, accepted, rejected).
   - **CMP Standard**: Detected consent framework (Didomi, OneTrust, Usercentrics, IAB_TCF, etc.).
   - **Technical Violations**: Lists tracking requests triggered prior to consent or after rejection.
   - **Privacy Policy Verification**: Audit of policy links, footer placement, pre-checked checkboxes, and legalese readability scans.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
All external rules datasets are owned and governed by their respective licenses (e.g., DuckDuckGo tracker blocklist is licensed under CC-BY-NC 4.0).
