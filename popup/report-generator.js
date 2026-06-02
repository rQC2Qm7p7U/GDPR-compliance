function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to generate a fully standalone printable HTML compliance report
function generateHtmlReport(exportData) {
  const {
    auditTimestamp,
    domain,
    selectedAuditMode,
    resolvedJurisdiction,
    consentStatus,
    cmpStandard,
    technicalAudits,
    manualChecklist,
    policyDeepScan,
    violationsCount,
    violations,
    userCountry
  } = exportData;

  const dateStr = new Date(auditTimestamp).toLocaleString();
  
  // Calculate compliance grade:
  // Grade A: 0 violations, all automated tests pass, no dark patterns
  // Grade B: 0 violations, minor warnings (e.g. policy link exists but not in footer)
  // Grade C: violations present but minor, or dark pattern present
  // Grade F: violations present (trackers loaded pre-consent or post-rejection)
  let grade = "A";
  let gradeClass = "grade-a";
  let gradeDesc = "Fully Compliant";

  const preConsentViolations = violations.filter(v => v.type === 'PRE_CONSENT' || v.type.endsWith('_BYPASS')).length;
  const postRejectionViolations = violations.filter(v => v.type === 'POST_REJECTION').length;

  if (preConsentViolations > 0 || postRejectionViolations > 0) {
    grade = "F";
    gradeClass = "grade-f";
    gradeDesc = "Non-Compliant (Critical Failures)";
  } else if (technicalAudits.cmpRejectButtonStatus === 'missing' || technicalAudits.cmpRejectButtonStatus === 'unequal' || !technicalAudits.privacyPolicyLink || technicalAudits.dataMinimizationStatus === 'failed' || technicalAudits.cmpPolicyLinkStatus === false) {
    grade = "C";
    gradeClass = "grade-c";
    gradeDesc = "Incomplete Compliance (Warnings)";
  } else if (!technicalAudits.policyInFooter || technicalAudits.preCheckedCheckboxesStatus === true || technicalAudits.dataMinimizationStatus === 'warning') {
    grade = "B";
    gradeClass = "grade-b";
    gradeDesc = "Mostly Compliant (Minor Adjustments Required)";
  }

  // Render violations list as rows
  let violationsRows = "";
  if (violations && violations.length > 0) {
    violations.forEach((v, idx) => {
      let badgeLabel = 'Pre-Consent';
      let badgeClass = 'badge-danger';
      if (v.type === 'POST_REJECTION') {
        badgeLabel = 'Post-Rejection';
      } else if (v.type.endsWith('_BYPASS')) {
        badgeLabel = `${resolvedJurisdiction} Bypass`;
      }

      violationsRows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="tracker-tag">${escapeHtml(v.trackerName)}</span></td>
          <td><span class="violation-badge ${badgeClass}">${badgeLabel}</span></td>
          <td class="url-cell"><div class="url-text" title="${escapeHtml(v.url)}">${escapeHtml(v.url)}</div></td>
          <td>${escapeHtml(v.initiator)}</td>
          <td>${new Date(v.timestamp).toLocaleTimeString()}</td>
        </tr>
      `;
    });
  } else {
    violationsRows = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 30px; font-style: italic;">
          ✓ No network/cookie compliance violations detected during the audit session.
        </td>
      </tr>
    `;
  }

  let policyDesc = `Checks for a visible privacy policy link matching ${resolvedJurisdiction} keywords.`;
  if (technicalAudits.privacyPolicyLink) {
    const cleanUrl = escapeHtml(technicalAudits.privacyPolicyLink);
    const displayUrl = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl;
    policyDesc += ` Found: ${displayUrl}`;
    if (policyDeepScan) {
      const details = [];
      if (policyDeepScan.hasDpo) details.push('DPO/Contacts');
      if (policyDeepScan.hasTransparency) details.push('Transparency');
      if (policyDeepScan.hasRights) details.push('User Rights');
      if (!policyDeepScan.isPlainLanguage) details.push('High legalese');
      if (details.length > 0) {
        policyDesc += ` | Scan findings: ${details.join(', ')}`;
      }
    }
  }

  // Generate automated checklist cards
  const checks = [
    { name: "HTTPS Security Protocol", val: technicalAudits.isHttpsSecure, desc: "Verifies the website uses SSL/TLS encryption." },
    { name: "Privacy Policy Link Detected", val: !!technicalAudits.privacyPolicyLink, desc: policyDesc },
    { name: "Policy Position in Footer", val: technicalAudits.policyInFooter, desc: "Checks if the policy link is in the footer or bottom scroll area." },
    { name: "Pre-Consent Tracker Block", val: technicalAudits.preConsentBlocked, desc: "Verifies cookies/trackers are blocked before user consent action." },
    { name: "First-layer 'Reject All' Button", val: technicalAudits.cmpRejectButtonStatus === 'detected', desc: "Verifies a Reject/Decline button is directly visible on the banner layer.", warn: technicalAudits.cmpRejectButtonStatus === 'unequal' },
    { name: "Privacy Policy Link in Banner", val: technicalAudits.cmpPolicyLinkStatus === true || technicalAudits.cmpPolicyLinkStatus === 'no_cmp', desc: "Verifies the cookie banner displays links to privacy/imprint documents.", warn: technicalAudits.cmpPolicyLinkStatus === false },
    { name: "Blank Checkbox Inputs (Opt-in)", val: technicalAudits.preCheckedCheckboxesStatus !== true, desc: "Verifies forms contain no pre-checked consent checkboxes." },
    { name: "Privacy Policy Link in Forms", val: technicalAudits.formPolicyLinkStatus === true || technicalAudits.formPolicyLinkStatus === 'no_forms', desc: "Checks if submission forms contain a policy link next to submit buttons." },
    { name: "Form Data Minimization", val: technicalAudits.dataMinimizationStatus === 'passed' || technicalAudits.dataMinimizationStatus === 'no_forms', desc: "Verifies subscription/input forms do not request excessive mandatory fields (like phone number).", warn: technicalAudits.dataMinimizationStatus === 'warning' }
  ];

  let checksCards = "";
  checks.forEach(c => {
    let statusClass = "";
    let statusText = "";
    let statusIcon = "";
    
    if (c.val === true || (c.name.includes("Checkbox") && c.val)) {
      statusClass = "pass";
      statusText = "PASS";
      statusIcon = `<svg class="status-svg success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (c.warn) {
      statusClass = "warn";
      statusText = "WARNING";
      statusIcon = `<svg class="status-svg warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      statusClass = "fail";
      statusText = "FAIL";
      statusIcon = `<svg class="status-svg danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }
    
    const automatedKeys = {
      "HTTPS Security Protocol": "https-security-protocol",
      "Privacy Policy Link Detected": "privacy-policy-link-detected",
      "Policy Position in Footer": "policy-position-in-footer",
      "Pre-Consent Tracker Block": "pre-consent-tracker-block",
      "First-layer 'Reject All' Button": "first-layer-reject-all-button",
      "Privacy Policy Link in Banner": "privacy-policy-link-in-banner",
      "Blank Checkbox Inputs (Opt-in)": "blank-checkbox-inputs-opt-in",
      "Privacy Policy Link in Forms": "privacy-policy-link-in-forms",
      "Form Data Minimization": "form-data-minimization"
    };
    const key = automatedKeys[c.name] || c.name.toLowerCase().replace(/\s+/g, '-');

    checksCards += `
      <div class="checklist-card ${statusClass}" style="cursor: pointer;" onclick="showHint('${key}')">
        <div class="card-status-icon">${statusIcon}</div>
        <div class="card-info">
          <div class="card-header-row">
            <span class="card-title">${escapeHtml(c.name)}</span>
            <span class="card-badge-status ${statusClass}">${statusText}</span>
          </div>
          <p class="card-desc">${escapeHtml(c.desc)}</p>
        </div>
      </div>
    `;
  });

  // Manual reviews cards
  let manualCards = "";
  if (manualChecklist && manualChecklist.selections) {
    const keys = Object.keys(manualChecklist.selections);
    if (keys.length > 0) {
      keys.forEach(k => {
        const checked = manualChecklist.selections[k];
        const statusClass = checked ? "pass" : "fail";
        const statusText = checked ? "VERIFIED" : "UNVERIFIED";
        const statusIcon = checked 
          ? `<svg class="status-svg success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
          : `<svg class="status-svg silent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        
        let title = k.replace(/_/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
        let desc = "";

        const jData = CHECKLIST_DATA[resolvedJurisdiction];
        let found = false;
        if (jData && jData.manual_items) {
          for (const grp of Object.values(jData.manual_items)) {
            const match = grp.find(item => item.id === k);
            if (match) {
              title = match.title;
              desc = match.desc;
              found = true;
              break;
            }
          }
        }

        if (!found) return;

        manualCards += `
          <div class="checklist-card ${statusClass}" style="cursor: pointer;" onclick="showHint('${k}')">
            <div class="card-status-icon">${statusIcon}</div>
            <div class="card-info">
              <div class="card-header-row">
                <span class="card-title">${escapeHtml(title)}</span>
                <span class="card-badge-status ${statusClass}">${statusText}</span>
              </div>
              <p class="card-desc">${escapeHtml(desc)}</p>
            </div>
          </div>
        `;
      });
    }
  }

  if (!manualCards) {
    manualCards = `<div class="empty-state">No manual checklist verification items recorded.</div>`;
  }

  // Developer Remediation Guidelines Block
  let remediationBlocks = "";
  if (preConsentViolations > 0 || postRejectionViolations > 0) {
    remediationBlocks += `
      <div class="remediation-card danger">
        <h4>1. Fix Illegal Tracker &amp; Cookie Initialization (Immediate Action Required)</h4>
        <p>The auditor detected tracking scripts or cookies initializing before consent was given (Pre-Consent) or after the user declined consent (Post-Rejection). This directly violates Article 7 of GDPR / Section 1798.120 of CCPA.</p>
        <h5>Remediation Instructions for Developers:</h5>
        <ul>
          <li><strong>GTM Consent Mode (v2)</strong>: Enable Tag Manager "Consent Settings". Do not fire Google Analytics, Facebook Pixel, or TikTok tags until <code>analytics_storage</code> and <code>ad_storage</code> are granted. For EEA users, ensure <code>ad_user_data</code> and <code>ad_personalization</code> flags are also configured.</li>
          <li><strong>Script Tag Wrapping (Client-Side HTML)</strong>: Prevent automatic loading of direct script tags by changing their type to <code>text/plain</code> and adding your CMP's specific activation attributes:
            <pre><code><span class="comment">&lt;!-- Change this: --&gt;</span>
&lt;<span class="tag">script</span> <span class="attr">src</span>=<span class="val">"https://example-tracker.com/pixel.js"</span>&gt;&lt;/<span class="tag">script</span>&gt;

<span class="comment">&lt;!-- To this (Example for dynamic CMP activation): --&gt;</span>
&lt;<span class="tag">script</span> <span class="attr">type</span>=<span class="val">"text/plain"</span> <span class="attr">class</span>=<span class="val">"opt-in-tracker"</span> <span class="attr">data-consent-category</span>=<span class="val">"marketing"</span> <span class="attr">src</span>=<span class="val">"https://example-tracker.com/pixel.js"</span>&gt;&lt;/<span class="tag">script</span>&gt;</code></pre>
            <span class="note" style="font-size: 11px; color: var(--color-text-light); font-style: italic; display: block; margin-top: 5px;">*Note: The exact class and data attribute depend on your specific CMP provider (e.g., Cookiebot uses <code>data-cookieconsent</code>, OneTrust uses specific class categories).</span>
          </li>
          <li><strong>Server-side Cookies (HTTP Headers)</strong>: Inspect your server configuration, CDN rules, or Edge Workers to ensure that server-side <code>Set-Cookie</code> headers for analytics and advertising (e.g., <code>IDE</code>, <code>_fbp</code>, <code>_ga</code>) are not dispatched during the initial load page request before consent is confirmed.</li>
        </ul>
      </div>
    `;
  }

  if (technicalAudits.cmpRejectButtonStatus === 'missing' || technicalAudits.cmpRejectButtonStatus === 'unequal') {
    const isMissing = technicalAudits.cmpRejectButtonStatus === 'missing';
    remediationBlocks += `
      <div class="remediation-card warning">
        <h4>2. Adjust Cookie Banner Design &amp; Options</h4>
        <p>The cookie banner ${isMissing ? 'is missing a direct "Reject All" button on the first screen layer' : 'contains a "Reject All" button that is visually styled unequally compared to the Accept button (Dark Pattern)'}. Regulatory agencies (like AZLP and EU DPAs) penalize unequal visual design weight.</p>
        <h5>Remediation Instructions for Developers/Designers:</h5>
        <ul>
          <li><strong>Button Prominence</strong>: Ensure the "Reject All" button is placed next to the "Accept All" button, using the same background contrast, font size, padding, and border weights. Do not hide reject actions inside a "Settings" link.</li>
          <li><strong>GPC Sync</strong>: Enable support for Global Privacy Control (GPC) header signals to automatically process opt-outs without displaying the banner.</li>
        </ul>
      </div>
    `;
  }

  if (technicalAudits.preCheckedCheckboxesStatus === true) {
    remediationBlocks += `
      <div class="remediation-card danger">
        <h4>3. Fix Pre-checked Consent Checkboxes</h4>
        <p>The auditor detected forms on the site containing pre-ticked checkboxes for marketing, newsletter, or data sharing consent. Under GDPR, consent must be an "unambiguous indication of the data subject's wishes by a clear affirmative action". Pre-checked boxes are illegal.</p>
        <h5>Remediation Instructions for Developers:</h5>
        <ul>
          <li><strong>HTML Checkboxes</strong>: Ensure all checkbox inputs have the <code>checked</code> attribute removed from their HTML:
            <pre><code><span class="comment">&lt;!-- Incorrect: --&gt;</span>
&lt;<span class="tag">input</span> <span class="attr">type</span>=<span class="val">"checkbox"</span> <span class="attr">name</span>=<span class="val">"marketing"</span> <span class="attr">checked</span>&gt;

<span class="comment">&lt;!-- Correct: --&gt;</span>
&lt;<span class="tag">input</span> <span class="attr">type</span>=<span class="val">"checkbox"</span> <span class="attr">name</span>=<span class="val">"marketing"</span>&gt;</code></pre>
          </li>
        </ul>
      </div>
    `;
  }

  if (!technicalAudits.privacyPolicyLink || !technicalAudits.policyInFooter) {
    remediationBlocks += `
      <div class="remediation-card warning">
        <h4>4. Correct Privacy Policy Placement</h4>
        <p>The Privacy Policy link is either not detected, or is not located in the standard footer/bottom scroll area of the page.</p>
        <h5>Remediation Instructions for Webmasters:</h5>
        <ul>
          <li>Place a clear link labeled "Privacy Policy" or "Datenschutz" inside the global site <code>&lt;footer&gt;</code> tag on every single page.</li>
        </ul>
      </div>
    `;
  }

  if (technicalAudits.dataMinimizationStatus === 'failed' || technicalAudits.dataMinimizationStatus === 'warning') {
    const isFailed = technicalAudits.dataMinimizationStatus === 'failed';
    remediationBlocks += `
      <div class="remediation-card ${isFailed ? 'danger' : 'warning'}">
        <h4>${isFailed ? '5. Implement Data Minimization (Excessive Mandatory Fields)' : '5. Review Form Fields (Data Minimization Recommendation)'}</h4>
        <p>${isFailed ? 'The auditor detected that your newsletter or subscription form requires a phone number or physical address, which is excessive and violates GDPR Article 5(1)(c) (Data Minimization).' : 'The auditor detected that your contact or registration form requires a physical address or birthdate, which may be excessive unless strictly necessary for the service.'}</p>
        <h5>Remediation Instructions for Developers:</h5>
        <ul>
          <li><strong>Remove Mandatory Constraint</strong>: Make the excessive fields (like phone, address, birthdate) optional rather than required. Remove the <code>required</code> attribute from the HTML input:
            <pre><code>&lt;!-- Incorrect: --&gt;
&lt;input type="tel" name="phone" required&gt;

&lt;!-- Correct: --&gt;
&lt;input type="tel" name="phone"&gt;</code></pre>
          </li>
          <li><strong>Purpose Justification</strong>: If these fields are strictly necessary, document the specific legal basis and commercial purpose in your Privacy Policy.</li>
        </ul>
      </div>
    `;
  }

  if (technicalAudits.cmpPolicyLinkStatus === false) {
    remediationBlocks += `
      <div class="remediation-card warning">
        <h4>6. Add Privacy Links to Cookie Banner</h4>
        <p>The cookie consent banner does not contain links to the Privacy Policy (Datenschutz) or Imprint (Impressum). This violates transparency principles under Article 13 of GDPR.</p>
        <h5>Remediation Instructions for Developers:</h5>
        <ul>
          <li>Configure your CMP (e.g. Usercentrics, OneTrust, Didomi) to enable footer links in the banner layout.</li>
          <li>Add clear, accessible anchor links to <code>Privacy Policy</code> and <code>Imprint</code> on the first layer of the banner template.</li>
        </ul>
      </div>
    `;
  }

  if (grade === "A") {
    remediationBlocks = `
      <div class="remediation-card success">
        <h4>No Actions Required!</h4>
        <p>Excellent! The website passed all automated checks. All tracking scripts and cookies were successfully blocked prior to user consent. The cookie consent banner provides equal visual choices for the user, and data collection forms comply with opt-in guidelines.</p>
      </div>
    `;
  }

  // Build the complete HTML string
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Audit Report: ${escapeHtml(domain)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: #0f172a;
      --color-primary-light: #1e293b;
      --color-accent: #4f46e5;
      --color-accent-light: #818cf8;
      --color-success: #10b981;
      --color-success-bg: #ecfdf5;
      --color-success-border: #a7f3d0;
      --color-danger: #ef4444;
      --color-danger-bg: #fef2f2;
      --color-danger-border: #fca5a5;
      --color-warning: #f59e0b;
      --color-warning-bg: #fffbeb;
      --color-warning-border: #fde68a;
      --color-gray-bg: #f8fafc;
      --color-border: #e2e8f0;
      --color-text: #475569;
      --color-text-dark: #0f172a;
      --color-text-light: #64748b;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--color-text);
      background-color: #f8fafc;
      line-height: 1.6;
      padding: 84px 20px 80px 20px;
    }

    /* Floating Action Bar */
    .action-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      z-index: 100;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05);
    }

    .action-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .action-bar-left h2 {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text-dark);
    }

    .action-bar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--color-accent);
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px 0 rgba(79, 70, 229, 0.2);
    }

    .btn-print:hover {
      background-color: #4338ca;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px 0 rgba(79, 70, 229, 0.3);
    }

    .btn-print:active {
      transform: translateY(0);
    }

    .btn-print svg {
      width: 16px;
      height: 16px;
    }

    /* Main Container */
    .report-container {
      max-width: 1000px;
      margin: 20px auto 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--color-border);
      overflow: hidden;
    }

    /* Header styling */
    header.report-header {
      background: linear-gradient(135deg, #0f172a, #1e1b4b);
      color: #ffffff;
      padding: 48px 48px 40px 48px;
      border-bottom: 5px solid var(--color-accent);
      position: relative;
    }

    header.report-header::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-image: radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
      pointer-events: none;
    }

    .header-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .header-logo svg {
      width: 36px;
      height: 36px;
      color: #818cf8;
      filter: drop-shadow(0 2px 8px rgba(129, 140, 248, 0.4));
    }

    .header-logo span {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .header-logo span span {
      color: #818cf8;
    }

    .report-title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.8px;
      color: #ffffff;
    }

    .report-subtitle {
      font-size: 15px;
      color: #94a3b8;
    }

    /* Meta Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 24px;
      padding: 32px 48px;
      background: var(--color-gray-bg);
      border-bottom: 1px solid var(--color-border);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--color-text-light);
    }

    .meta-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-dark);
    }

    .grade-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    .grade-a { background-color: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success-border); }
    .grade-b { background-color: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success-border); }
    .grade-c { background-color: var(--color-warning-bg); color: var(--color-warning); border: 1px solid var(--color-warning-border); }
    .grade-f { background-color: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger-border); }

    /* Body Container */
    .report-body {
      padding: 48px;
    }

    section.report-section {
      margin-bottom: 48px;
    }

    section.report-section h3 {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-text-dark);
      margin-bottom: 24px;
      border-left: 4px solid var(--color-accent);
      padding-left: 14px;
      letter-spacing: -0.5px;
    }

    /* Overall Grade Block */
    .status-summary-block {
      display: flex;
      align-items: center;
      gap: 32px;
      padding: 36px;
      border-radius: 12px;
      margin-bottom: 40px;
      border-width: 1px;
      border-style: solid;
    }

    .status-summary-block.block-a, .status-summary-block.block-b {
      background-color: var(--color-success-bg);
      border-color: var(--color-success-border);
    }

    .status-summary-block.block-c {
      background-color: var(--color-warning-bg);
      border-color: var(--color-warning-border);
    }

    .status-summary-block.block-f {
      background-color: var(--color-danger-bg);
      border-color: var(--color-danger-border);
    }

    .grade-big-circle {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 42px;
      font-weight: 800;
      flex-shrink: 0;
      border: 4px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.06);
    }

    .block-a .grade-big-circle, .block-b .grade-big-circle { background-color: var(--color-success); color: #ffffff; }
    .block-c .grade-big-circle { background-color: var(--color-warning); color: #ffffff; }
    .block-f .grade-big-circle { background-color: var(--color-danger); color: #ffffff; }

    .status-text h4 {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 8px;
      color: var(--color-text-dark);
      letter-spacing: -0.5px;
    }

    .status-text p {
      font-size: 15px;
      color: var(--color-text);
      line-height: 1.6;
    }

    /* Checklist Card Layout */
    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 20px;
      margin-bottom: 10px;
    }

    .checklist-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: #ffffff;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      transition: all 0.25s ease;
      position: relative;
    }

    .checklist-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px -4px rgba(15, 23, 42, 0.06);
      border-color: #cbd5e1;
    }

    .checklist-card.pass { border-left: 4px solid var(--color-success); }
    .checklist-card.warn { border-left: 4px solid var(--color-warning); }
    .checklist-card.fail { border-left: 4px solid var(--color-danger); }

    .card-status-icon {
      flex-shrink: 0;
    }

    .status-svg {
      width: 24px;
      height: 24px;
    }
    
    .status-svg.success { color: var(--color-success); }
    .status-svg.warning { color: var(--color-warning); }
    .status-svg.danger { color: var(--color-danger); }
    .status-svg.silent { color: var(--color-text-light); }

    .card-info {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 2px;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-dark);
      line-height: 1.3;
    }

    .card-badge-status {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-badge-status.pass { background-color: var(--color-success-bg); color: var(--color-success); }
    .card-badge-status.warn { background-color: var(--color-warning-bg); color: var(--color-warning); }
    .card-badge-status.fail { background-color: var(--color-danger-bg); color: var(--color-danger); }

    .card-desc {
      font-size: 13px;
      color: var(--color-text-light);
      line-height: 1.4;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 32px;
      color: var(--color-text-light);
      background-color: var(--color-gray-bg);
      border: 1px dashed var(--color-border);
      border-radius: 8px;
      font-style: italic;
      font-size: 14px;
    }

    /* Remediation Cards */
    .remediation-card {
      padding: 28px;
      border-radius: 12px;
      margin-bottom: 24px;
      border-left: 6px solid;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }

    .remediation-card.danger {
      background-color: var(--color-danger-bg);
      border-color: var(--color-danger);
      color: #7f1d1d;
    }

    .remediation-card.danger h4 { color: #991b1b; margin-bottom: 12px; font-size: 18px; font-weight: 700; }

    .remediation-card.warning {
      background-color: var(--color-warning-bg);
      border-color: var(--color-warning);
      color: #78350f;
    }

    .remediation-card.warning h4 { color: #92400e; margin-bottom: 12px; font-size: 18px; font-weight: 700; }

    .remediation-card.success {
      background-color: var(--color-success-bg);
      border-color: var(--color-success);
      color: #064e3b;
    }

    .remediation-card.success h4 { color: #065f46; margin-bottom: 12px; font-size: 18px; font-weight: 700; }

    .remediation-card p {
      font-size: 14.5px;
      margin-bottom: 16px;
      line-height: 1.6;
    }

    .remediation-card h5 {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .remediation-card ul {
      margin-left: 24px;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .remediation-card li {
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .remediation-card pre {
      background-color: rgba(15, 23, 42, 0.06);
      border: 1px solid rgba(15, 23, 42, 0.1);
      padding: 16px;
      border-radius: 8px;
      font-family: 'SFMono-Regular', Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 10px;
      color: #0f172a;
      line-height: 1.5;
    }

    .remediation-card pre code {
      font-family: inherit;
      color: inherit;
    }
    
    .remediation-card pre .comment {
      color: #64748b;
      font-style: italic;
    }
    
    .remediation-card pre .tag {
      color: #2563eb;
      font-weight: 600;
    }

    .remediation-card pre .attr {
      color: #b45309;
    }

    .remediation-card pre .val {
      color: #059669;
    }

    /* Tables */
    .table-container {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: #ffffff;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.01);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    table.data-table th {
      background-color: var(--color-gray-bg);
      color: var(--color-text-dark);
      font-weight: 700;
      text-align: left;
      padding: 14px 20px;
      border-bottom: 2px solid var(--color-border);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    table.data-table td {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      vertical-align: middle;
    }

    table.data-table tr:last-child td {
      border-bottom: none;
    }

    table.data-table tr:hover {
      background-color: #f8fafc80;
    }

    .url-cell {
      max-width: 280px;
    }

    .url-text {
      display: block;
      font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
      font-size: 11px;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 8px;
      overflow-x: auto;
      white-space: nowrap;
      color: #1e293b;
      max-width: 100%;
    }

    .url-text::-webkit-scrollbar {
      height: 3px;
    }

    .url-text::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 1.5px;
    }

    .tracker-tag {
      font-weight: 600;
      color: var(--color-text-dark);
      background-color: #f1f5f9;
      border: 1px solid var(--color-border);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      display: inline-block;
    }

    .violation-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid;
    }

    .badge-danger { 
      background-color: var(--color-danger-bg); 
      color: var(--color-danger); 
      border-color: var(--color-danger-border); 
    }

    /* Print styles */
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .report-container {
        box-shadow: none;
        border: none;
        margin: 0;
      }
      header.report-header {
        padding: 20px 0;
        background: #ffffff !important;
        color: #000000 !important;
        border-bottom: 2px solid #000000;
      }
      header.report-header::before {
        display: none;
      }
      .header-logo svg {
        color: #000000 !important;
      }
      .header-logo span, .report-title, .report-subtitle {
        color: #000000 !important;
      }
      .meta-grid {
        background: #ffffff !important;
        padding: 20px 0;
        border-bottom: 1px solid #000000;
      }
      .meta-value {
        color: #000000 !important;
      }
      .report-body {
        padding: 20px 0;
      }
      .status-summary-block {
        background: #ffffff !important;
        border: 1px solid #000000 !important;
        page-break-inside: avoid;
      }
      .grade-big-circle {
        border-color: #000000 !important;
        color: #000000 !important;
        background: #ffffff !important;
      }
      .block-a .grade-big-circle, .block-b .grade-big-circle,
      .block-c .grade-big-circle, .block-f .grade-big-circle {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .remediation-card {
        background: #ffffff !important;
        border: 1px solid #000000 !important;
        border-left: 6px solid #000000 !important;
        color: #000000 !important;
        page-break-inside: avoid;
      }
      .remediation-card h4, .remediation-card p, .remediation-card h5, .remediation-card pre {
        color: #000000 !important;
      }
      .remediation-card pre {
        background: #ffffff !important;
        border: 1px solid #000000 !important;
      }
      .checklist-card {
        border: 1px solid #000000 !important;
        background: #ffffff !important;
        page-break-inside: avoid;
      }
      .checklist-card.pass { border-left: 4px solid #000000 !important; }
      .checklist-card.warn { border-left: 4px solid #000000 !important; }
      .checklist-card.fail { border-left: 4px solid #000000 !important; }
      .card-badge-status.pass, .card-badge-status.warn, .card-badge-status.fail {
        border: 1px solid #000000 !important;
        color: #000000 !important;
        background: #ffffff !important;
      }
      .url-text {
        background: #ffffff !important;
        border: 1px solid #000000 !important;
        white-space: normal !important;
        word-break: break-all !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }

    /* Interactive Popover Modal */
    .hint-modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    .hint-modal.active {
      display: flex;
      opacity: 1;
    }

    .hint-modal-content {
      background: #ffffff;
      border-radius: 16px;
      width: 90%;
      max-width: 550px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-border);
      padding: 30px;
      position: relative;
      transform: translateY(20px);
      transition: transform 0.25s ease;
    }

    .hint-modal.active .hint-modal-content {
      transform: translateY(0);
    }

    .hint-modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text-light);
      cursor: pointer;
      line-height: 1;
    }

    .hint-modal-close:hover {
      color: var(--color-text-dark);
    }

    .hint-modal-header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--color-border);
    }

    .hint-modal-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-dark);
      margin-bottom: 6px;
    }

    .hint-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background: #e0e7ff;
      color: var(--color-accent);
      padding: 3px 8px;
      border-radius: 4px;
    }

    .hint-modal-body p {
      font-size: 14.5px;
      line-height: 1.6;
      color: var(--color-text);
      margin-bottom: 20px;
    }

    .hint-legal-block, .hint-remediation-block {
      background: var(--color-gray-bg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      text-align: left;
    }

    .hint-legal-block h5, .hint-remediation-block h5 {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--color-text-dark);
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    .hint-legal-block code {
      font-family: SFMono-Regular, Consolas, monospace;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: var(--color-accent);
    }
    
    .checklist-card:hover {
      border-color: var(--color-accent-light) !important;
    }
  </style>
</head>
<body>

  <!-- Floating Action Bar (Sticky, hides during print) -->
  <div class="action-bar no-print">
    <div class="action-bar-left">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 12 4 18 12 22Z"/>
      </svg>
      <h2>Privacy compliance Report</h2>
    </div>
    <div class="action-bar-right">
      <button onclick="window.print()" class="btn-print">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print / Save PDF
      </button>
    </div>
  </div>

  <div class="report-container">
    
    <header class="report-header">
      <div class="header-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 12 4 18 12 22Z"/>
        </svg>
        <span>Privacy<span>Auditor</span></span>
      </div>
      <h1 class="report-title">Privacy Compliance Audit Report</h1>
      <div class="report-subtitle">Generated by privacy compliance browser evaluation engine</div>
    </header>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Audit Domain</span>
        <span class="meta-value">${escapeHtml(domain)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Evaluation Date</span>
        <span class="meta-value">${dateStr}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Simulated Profile</span>
        <span class="meta-value">${escapeHtml(selectedAuditMode.toUpperCase())}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Jurisdiction Standard</span>
        <span class="meta-value">${escapeHtml(resolvedJurisdiction)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">User Country</span>
        <span class="meta-value">${escapeHtml(userCountry || 'Not Detected')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Page Language</span>
        <span class="meta-value">${escapeHtml(technicalAudits.pageLanguage ? technicalAudits.pageLanguage.toUpperCase() : 'Not Detected')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Consent State</span>
        <span class="meta-value">${escapeHtml(consentStatus ? consentStatus.toUpperCase() : 'UNKNOWN')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">CMP Standard</span>
        <span class="meta-value">${escapeHtml(cmpStandard ? (cmpStandard === 'IAB_TCF' ? 'IAB TCF v2.2' : cmpStandard) : 'None Detected')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Overall Grade</span>
        <span class="meta-value"><span class="grade-badge ${gradeClass}" style="cursor: pointer;" onclick="showHint('grade')">${gradeDesc} (${grade})</span></span>
      </div>
    </div>

    <div class="report-body">
      
      <!-- Summary Block -->
      <div class="status-summary-block block-${grade.toLowerCase()}" style="cursor: pointer;" onclick="showHint('grade')">
        <div class="grade-big-circle">${grade}</div>
        <div class="status-text">
          <h4>Status: ${gradeDesc}</h4>
          <p>
            ${grade === 'A' ? 'The audited website meets critical criteria. All third-party trackers are blocked by default, forms utilize active opt-in, and the cookie consent banner allows a direct reject path.' :
              grade === 'B' ? 'The website conforms to core standards but contains minor issues such as policy positioning or form details. Ensure minor fixes are addressed.' :
              grade === 'C' ? 'Minor compliance issues detected. Banners or links must be adjusted to align with privacy regulation criteria.' :
              'Critical violations detected. The website initiates tracking calls before user consent or after user refusal. Action items must be resolved immediately by development teams.'}
          </p>
        </div>
      </div>

      <!-- Action Items Section -->
      <section class="report-section">
        <h3>IT &amp; Developer Remediation Guidelines</h3>
        ${remediationBlocks}
      </section>

      <!-- Violations List -->
      <section class="report-section">
        <h3>Audited Tracker Violations Log (${violationsCount})</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 25%">Tracker System</th>
                <th style="width: 15%">Violation Context</th>
                <th style="width: 30%">Request Target</th>
                <th style="width: 15%">Originator</th>
                <th style="width: 10%">Time</th>
              </tr>
            </thead>
            <tbody>
              ${violationsRows}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Automated Audit Checklist -->
      <section class="report-section">
        <h3>Automated Scanner Checklist</h3>
        <div class="checklist-grid">
          ${checksCards}
        </div>
      </section>

      <!-- Manual Checklist Status -->
      <section class="report-section">
        <h3>Manual Checklist Review</h3>
        <div class="checklist-grid">
          ${manualCards}
        </div>
      </section>

    </div>

  </div>

  <!-- Interactive Popover Modal (no-print) -->
  <div id="hint-modal" class="hint-modal no-print">
    <div class="hint-modal-content">
      <button class="hint-modal-close" id="close-modal">&times;</button>
      <div class="hint-modal-header">
        <h3 id="hint-modal-title">Requirement</h3>
        <span class="hint-badge" id="hint-modal-badge">Basis</span>
      </div>
      <div class="hint-modal-body">
        <p id="hint-modal-desc">Detailed explanation...</p>
        <div class="hint-legal-block">
          <h5>Regulatory Legal Basis:</h5>
          <code id="hint-modal-legal">GDPR Article</code>
        </div>
        <div class="hint-remediation-block">
          <h5>Actionable Remediation Steps:</h5>
          <p id="hint-modal-action">Remediation steps...</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    const HINT_DATA = {
      'grade': {
        title: 'How Compliance Grades Are Calculated',
        basis: 'Audit Rating Heuristics',
        desc: 'The grade represents the overall privacy compliance risk score of the website:',
        action: '• Grade A: 0 network/cookie violations, all automated tests passed, equal Choice button weights.\\n• Grade B: 0 network/cookie violations, minor layout warnings (e.g. policy link exists but not in the standard footer, data minimization warnings).\\n• Grade C: 0 network/cookie violations, but severe layout/UI dark patterns (e.g. unequal reject buttons, missing banner policy links).\\n• Grade F: Network or cookie violations detected (trackers initialized pre-consent or post-rejection).'
      },
      'https-security-protocol': {
        title: 'HTTPS Security Protocol',
        basis: 'GDPR Article 32 (Security of Processing)',
        desc: 'Verifies the website uses an encrypted SSL/TLS connection (https://). Security is the cornerstone of privacy.',
        action: 'Ensure a valid, active SSL certificate is installed on your web server and that all http:// traffic is permanently redirected to https://.'
      },
      'privacy-policy-link-detected': {
        title: 'Privacy Policy Link Detected',
        basis: 'GDPR Articles 12 & 13, CCPA § 1798.100',
        desc: 'Verifies the presence of a visible hyperlink leading to the privacy disclosures page.',
        action: 'Link a valid privacy policy document matching local regulatory requirements (e.g. detailing DPO contact, user rights, data retention policies).'
      },
      'policy-position-in-footer': {
        title: 'Policy Position in Footer',
        basis: 'GDPR Transparency principles / CalOPPA',
        desc: 'Checks if the privacy link is placed in the global website footer. The policy must be accessible in a single click from any page.',
        action: 'Place clear, recognizable anchor links to "Privacy Policy" or "Datenschutz" inside the HTML global <footer> tag.'
      },
      'pre-consent-tracker-block': {
        title: 'Pre-Consent Tracker Block',
        basis: 'ePrivacy Directive Article 5(3), GDPR Article 7',
        desc: 'Checks if non-essential tracking cookies or scripts (e.g., marketing pixels, analytics) fire before user consent.',
        action: 'Configure your Tag Manager (GTM) or consent management provider (CMP) to hold script triggers until active consent is granted (Consent Mode).'
      },
      'first-layer-reject-all-button': {
        title: "First-layer 'Reject All' Button",
        basis: 'EDPB Guidelines 05/2020 on Consent',
        desc: 'Checks if the cookie banner features a direct "Reject All" button on the first visible screen layer.',
        action: 'Do not hide the reject button behind settings or submenus. It must be as accessible and prominent as the "Accept All" button.'
      },
      'privacy-policy-link-in-banner': {
        title: 'Privacy Policy Link in Banner',
        basis: 'GDPR Article 13 & transparency rules',
        desc: 'Verifies the cookie consent banner template includes links to the site\'s Privacy Policy and Imprint disclosures.',
        action: 'Edit your CMP layout settings to enable direct link anchors to privacy and legal notice pages in the banner text.'
      },
      'blank-checkbox-inputs-opt-in': {
        title: 'Blank Checkbox Inputs (Opt-in)',
        basis: 'GDPR Recital 32 & CJEU Case C-673/17',
        desc: 'Verifies that newsletter subscription, contact, or checkout forms do not contain pre-checked consent checkboxes.',
        action: 'Remove the "checked" attribute from all marketing or policy agreement checkbox inputs. Consent must be a positive opt-in action.'
      },
      'privacy-policy-link-in-forms': {
        title: 'Privacy Policy Link in Forms',
        basis: 'GDPR Article 6 (Lawfulness of processing)',
        desc: 'Checks if forms collecting personal data include a clear privacy policy link next to the submission triggers.',
        action: 'Add a small disclaimer label with an active link next to submission buttons, e.g., "By signing up, you agree to our [Privacy Policy](URL)".'
      },
      'form-data-minimization': {
        title: 'Form Data Minimization',
        basis: 'GDPR Article 5(1)(c) (Data Minimization)',
        desc: 'Checks if submission forms request excessive mandatory data fields that are unnecessary for the service (e.g. phone number for marketing updates).',
        action: 'Audit your form designs. Change mandatory requirements to optional (remove the HTML "required" tag) for non-essential fields.'
      },
      'plain_language': {
        title: 'Plain Language Disclosures / Right Notice',
        basis: 'GDPR Article 12(1) / CCPA notice',
        desc: 'Ensures the privacy policy document is written in clear, concise, plain, and easy-to-understand language.',
        action: 'Rewrite complex legalese sentences. Use headings, bullet points, and tables to make the document highly readable for average users.'
      },
      'dpo_contacts': {
        title: 'DPO & Operator Contact Information',
        basis: 'GDPR Article 13(1)(a) & (b) / CCPA',
        desc: 'Verifies the contact details of the website operator and the Data Protection Officer (if applicable) are explicitly stated.',
        action: 'Add email, physical address, and contact forms for the data controller and DPO under the "Contact Information" section.'
      },
      'data_transparency': {
        title: 'Detailed Processing Transparency / Notice',
        basis: 'GDPR Article 13 & 14 / CCPA Notice at Collection',
        desc: 'Checks if the policy details the categories of data collected, commercial purposes, storage duration, and data processors.',
        action: 'Insert a detailed data processing table mapping: What we collect -> Why -> Legal basis -> Storage duration -> Shared with.'
      },
      'user_rights': {
        title: 'User Privacy Rights Disclosures',
        basis: 'GDPR Articles 15-21 / CCPA Rights to Delete & Correct',
        desc: 'Checks if users are explicitly informed of their rights to access, rectify, delete, restrict, port, and object to processing.',
        action: 'Add a dedicated section detailing how users can exercise their rights, including a submission channel or contact link.'
      },
      'equal_buttons': {
        title: 'Equal Choices Button styling / Opt-out Banner',
        basis: 'EDPB Dark Patterns Guideline 03/2022',
        desc: 'Verifies the "Accept All" and "Reject All" buttons on the cookie banner share identical background weights, color contrast, and padding.',
        action: 'Ensure your banner design has balanced button weights. Avoid styling "Reject" as a grey text link while "Accept" is a bright colored button.'
      },
      'granular_preferences': {
        title: 'Granular Preference Choices / GPC Support',
        basis: 'GDPR Article 7(2) Consent / CCPA GPC',
        desc: 'Ensures users can consent to specific tracker categories independently or opt-out via global signals.',
        action: 'Configure your CMP to display separate category checkboxes inside preference settings, keeping them unticked by default, or support reading automated GPC browser headers.'
      },
      'persistent_settings_btn': {
        title: 'Persistent Settings Withdrawal / No Discrimination',
        basis: 'GDPR Article 7(3) (Right to withdraw) / CCPA',
        desc: 'Verifies a persistent settings button remains visible, or guarantees users are not discriminated against for exercising privacy rights.',
        action: 'Enable the CMP "reopen settings" floating widget or place a persistent "Cookie Settings" link in the footer.'
      },
      'separate_consent': {
        title: 'No Bundled Marketing Opt-In / Right to Limit',
        basis: 'GDPR Article 7(4) (Conditionality) / CCPA',
        desc: 'Verifies that completing a transaction or submitting a form does not force or automatically bundle marketing subscriptions.',
        action: 'Ensure newsletter checkboxes are not pre-checked, and that agreeing to website Terms of Service is separate from marketing subscription.'
      }
    };

    function showHint(key) {
      const data = HINT_DATA[key];
      if (!data) return;
      
      document.getElementById('hint-modal-title').textContent = data.title;
      document.getElementById('hint-modal-badge').textContent = data.basis;
      document.getElementById('hint-modal-desc').textContent = data.desc;
      
      const actionEl = document.getElementById('hint-modal-action');
      actionEl.innerHTML = data.action.replace(/\\n/g, '<br>');
      
      const legalBlock = document.querySelector('.hint-legal-block');
      if (data.basis.includes('Article') || data.basis.includes('CCPA') || data.basis.includes('ePrivacy') || data.basis.includes('EDPB')) {
        legalBlock.style.display = 'block';
        document.getElementById('hint-modal-legal').textContent = data.basis;
      } else {
        legalBlock.style.display = 'none';
      }
      
      const modal = document.getElementById('hint-modal');
      modal.classList.add('active');
    }

    document.addEventListener('DOMContentLoaded', () => {
      const modal = document.getElementById('hint-modal');
      const closeBtn = document.getElementById('close-modal');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('active');
          }
        });
      }
    });
  </script>

</body>
</html>`;
}
