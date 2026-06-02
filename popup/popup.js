document.addEventListener('DOMContentLoaded', async () => {
  // Global Profile Selector
  const auditModeSelect = document.getElementById('audit-mode-select');

  // Tab 1 UI Elements
  const activeDomainEl = document.getElementById('active-domain');
  const consentStatusEl = document.getElementById('consent-status');
  const cmpStandardEl = document.getElementById('cmp-standard');
  const cmpBadgeEl = document.getElementById('cmp-badge');
  const violationsCountEl = document.getElementById('violations-count');
  const violationsListEl = document.getElementById('violations-list');
  const complianceSummaryEl = document.getElementById('compliance-summary');
  const summaryIconEl = document.getElementById('summary-icon');
  const summaryTitleEl = document.getElementById('summary-title');
  const summaryDescEl = document.getElementById('summary-desc');
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');

  // Tab 2 Checklist Headers
  const checklistTitleEl = document.getElementById('checklist-title');
  const detectionInfoEl = document.getElementById('checklist-detection-info');
  const groupTitlePolicy = document.getElementById('group-title-policy');
  const groupTitleCookie = document.getElementById('group-title-cookie');
  const groupTitleForms = document.getElementById('group-title-forms');
  const groupTitleSecurity = document.getElementById('group-title-security');

  // Tab 2 Automated Scans Elements
  const checkPolicyExistsEl = document.getElementById('check-policy-exists');
  const checkPolicyFooterEl = document.getElementById('check-policy-footer');
  const checkCookieBlockEl = document.getElementById('check-cookie-block');
  const checkCookieRejectEl = document.getElementById('check-cookie-reject');
  const checkFormPrecheckedEl = document.getElementById('check-form-prechecked');
  const checkFormLinkEl = document.getElementById('check-form-link');
  const checkFormMinimizationEl = document.getElementById('check-form-minimization');
  const checkSecurityHttpsEl = document.getElementById('check-security-https');

  // Tab Buttons & Panels
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let activeTab = null;
  let tabState = null;
  let tabDomain = 'unknown';

  // Checklist texts database mapping per jurisdiction (11 items per standard)
  const CHECKLIST_DATA = {
    GDPR: {
      title: 'European Union (GDPR) Compliance',
      group_policy: '1. Privacy Policy',
      group_cookie: '2. Cookie Banner & Options',
      group_forms: '3. Data Collection Forms',
      group_security: '4. Technical Security',
      manual_items: {
        policy: [
          {
            id: 'plain_language',
            title: 'Plain Language Check',
            desc: 'Policy is written in clear, simple language without excessive legalese (Art. 12).'
          },
          {
            id: 'dpo_contacts',
            title: 'DPO & Company Contacts',
            desc: 'Explicit contact details of the operator and Data Protection Officer are visible (Art. 13/14).',
            autoField: 'hasDpo'
          },
          {
            id: 'data_transparency',
            title: 'Data Transparency Details',
            desc: 'Specifies exactly what data is collected, for what purpose, where it is stored, and who receives it (Art. 13).',
            autoField: 'hasTransparency'
          },
          {
            id: 'user_rights',
            title: 'User Rights Disclosures',
            desc: 'Clearly details consumer rights to access, erase, correct, restrict, and port data (Art. 15-21).',
            autoField: 'hasRights'
          }
        ],
        cookie: [
          {
            id: 'equal_buttons',
            title: 'Equal Choice Button Weight',
            desc: '"Accept All" and "Reject All" buttons share identical visual weights (size, color, prominence).',
            autoField: 'equalButtons'
          },
          {
            id: 'granular_preferences',
            title: 'Granular Preferences Option',
            desc: 'Allows users to toggle categories (e.g. analytics, marketing) rather than all-or-nothing.'
          },
          {
            id: 'persistent_settings_btn',
            title: 'Persistent Re-opt-in Option',
            desc: 'A permanent button or widget remains on screen to allow withdrawal or settings change (Art. 7).'
          }
        ],
        forms: [
          {
            id: 'separate_consent',
            title: 'No Bundled Marketing Consent',
            desc: 'Registration/checkout forms do not bundle marketing opt-ins. Marketing consent is separate.'
          }
        ],
        security: []
      }
    },
    CCPA: {
      title: 'California (CCPA/CPRA) Compliance',
      group_policy: '1. Privacy Disclosures',
      group_cookie: '2. Consumer Opt-Out',
      group_forms: '3. Data Notice at Collection',
      group_security: '4. Technical Security',
      manual_items: {
        policy: [
          {
            id: 'plain_language',
            title: 'Notice of Consumer Rights',
            desc: 'Explains CCPA rights to know, delete, correct, and limit sensitive data.'
          },
          {
            id: 'dpo_contacts',
            title: 'Contact Channels',
            desc: 'Lists at least two methods to submit requests (e.g., toll-free number and email).',
            autoField: 'hasDpo'
          },
          {
            id: 'data_transparency',
            title: 'Notice at Collection Details',
            desc: 'Explains categories of personal information collected, sources, and commercial purposes.',
            autoField: 'hasTransparency'
          },
          {
            id: 'user_rights',
            title: 'Service Provider Disclosures',
            desc: 'Lists categories of personal info disclosed, sold, or shared in the past 12 months.',
            autoField: 'hasRights'
          }
        ],
        cookie: [
          {
            id: 'equal_buttons',
            title: 'Do Not Sell/Share Opt-out',
            desc: 'Banners support immediate opt-out from data selling and cross-context behavioral ads.'
          },
          {
            id: 'granular_preferences',
            title: 'Global Privacy Control (GPC)',
            desc: 'Banner is configured to read and honor GPC signals from user browsers automatically.'
          },
          {
            id: 'persistent_settings_btn',
            title: 'No Discrimination Policy',
            desc: 'Clearly guarantees users will not receive degraded service or pricing for exercising privacy rights.'
          }
        ],
        forms: [
          {
            id: 'separate_consent',
            title: 'Right to Limit Opt-in',
            desc: 'Forms do not automatically share sensitive personal info without explicit warning/consent.'
          }
        ],
        security: []
      }
    },
    ZZPL: {
      title: 'Montenegrin Law (ZZPL) Compliance',
      group_policy: '1. Politika privatnosti',
      group_cookie: '2. Banner i kolačići (Cookies)',
      group_forms: '3. Forme za prikupljanje podataka',
      group_security: '4. Tehnička sigurnost i zaštita',
      manual_items: {
        policy: [
          {
            id: 'plain_language',
            title: 'Službeni prevod',
            desc: 'Politika je u cjelosti dostupna na službenom crnogorskom jeziku bez stranih pravnih fraza.'
          },
          {
            id: 'dpo_contacts',
            title: 'Kontakt podaci rukovaoca',
            desc: 'Navedeno ime/naziv, adresa i kontakt rukovaoca zbirke ličnih podataka.',
            autoField: 'hasDpo'
          },
          {
            id: 'data_transparency',
            title: 'Svrha i pravni osnov obrade',
            desc: 'Precizno definisana svrha prikupljanja (čl. 10 ZZPL) i spisak primaoca podataka.',
            autoField: 'hasTransparency'
          },
          {
            id: 'user_rights',
            title: 'Prava lica (čl. 24 ZZPL)',
            desc: 'Korisnik je obaviješten o pravu na pristup, ispravku, brisanje i prigovor AZLP agenciji.',
            autoField: 'hasRights'
          }
        ],
        cookie: [
          {
            id: 'equal_buttons',
            title: 'Ravnopravne opcije (Accept/Reject)',
            desc: 'Dugmad za prihvatanje i odbijanje kolačića su jednakog oblika, boje i veličine na prvom sloju.',
            autoField: 'equalButtons'
          },
          {
            id: 'granular_preferences',
            title: 'Granularni izbor kolačića',
            desc: 'Korisnik može odvojeno uključiti statistiku ili marketing. Neophodni se ne mogu isključiti.'
          },
          {
            id: 'persistent_settings_btn',
            title: 'Konstantna vidljivost opoziva',
            desc: 'Prečica ili lebdeća ikonica za promjenu saglasnosti je vidljiva na sajtu tokom cijele sesije.'
          }
        ],
        forms: [
          {
            id: 'separate_consent',
            title: 'Poseban pristanak za marketing',
            desc: 'Saglasnost na uslove korišćenja ne daje pravo na automatsko slanje marketinških poruka.'
          }
        ],
        security: []
      }
    }
  };

  // Helper to escape HTML characters
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 1. Format timestamps
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // 2. Tab Navigation
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      tabContents.forEach(content => {
        if (content.id === targetTab) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  // 3. Initialize active tab and profile select values
  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        activeDomainEl.textContent = 'No active tab';
        btnExport.setAttribute('disabled', 'true');
        return;
      }
      activeTab = tab;

      // Load Profile dropdown value
      const resultMode = await chrome.storage.local.get('globalAuditMode');
      auditModeSelect.value = resultMode.globalAuditMode || 'auto';

      // Extract domain name
      try {
        const url = new URL(tab.url);
        tabDomain = url.hostname;
        if (url.protocol.startsWith('chrome') || url.protocol === 'about:') {
          activeDomainEl.textContent = 'System Page';
          consentStatusEl.textContent = 'N/A';
          consentStatusEl.className = 'status-value text-muted';
          cmpStandardEl.textContent = '—';
          setSummaryState('neutral', 'System Tab', 'Extension auditing is not active on system pages.');
          
          detectionInfoEl.textContent = 'Audits not available on system pages.';
          [checkPolicyExistsEl, checkPolicyFooterEl, checkCookieBlockEl, checkCookieRejectEl, checkFormPrecheckedEl, checkFormLinkEl, checkSecurityHttpsEl, checkFormMinimizationEl].forEach(el => {
            el.textContent = '⏳';
            el.className = 'chk-status status-loading';
          });
          btnExport.setAttribute('disabled', 'true');
          return;
        }
        activeDomainEl.textContent = tabDomain;
      } catch (e) {
        activeDomainEl.textContent = 'Invalid URL';
        return;
      }

      await loadState();
    } catch (err) {
      console.error('[GDPR Audit] Init error:', err);
    }
  }

  // 4. Load State from Session Storage
  async function loadState() {
    if (!activeTab) return;
    const key = `tab_${activeTab.id}`;
    const data = await chrome.storage.session.get(key);
    tabState = data[key] || { 
      consentStatus: 'unknown', 
      source: null, 
      violations: [], 
      isHttps: false, 
      privacyPolicyLink: null, 
      jurisdiction: null, 
      lang: null, 
      userCountry: null, 
      auditMode: 'auto', 
      policyInFooter: false, 
      preCheckedCheckboxes: false, 
      hasFormPolicyLink: false, 
      cmpRejectStatus: 'no_cmp',
      policyDeepScan: null,
      dataMinimizationStatus: 'passed'
    };

    updateUI();
  }

  // Render granular manual checkboxes based on current standard, caching states in local storage
  async function renderManualChecklist(jurisdiction, domain, state) {
    const containers = {
      policy: document.getElementById('manual-policy-container'),
      cookie: document.getElementById('manual-cookie-container'),
      forms: document.getElementById('manual-forms-container'),
      security: document.getElementById('manual-security-container')
    };

    if (!containers.policy || !containers.cookie || !containers.forms || !containers.security) return;

    // Load saved checklist choices from local storage
    const storageKey = `compliance_${jurisdiction}_${domain}`;
    const result = await chrome.storage.local.get(storageKey);
    const savedData = result[storageKey] || {};

    const checklistTexts = CHECKLIST_DATA[jurisdiction];
    if (!checklistTexts || !checklistTexts.manual_items) return;

    Object.keys(containers).forEach(groupKey => {
      const container = containers[groupKey];
      container.innerHTML = ''; // Clear previous items

      const items = checklistTexts.manual_items[groupKey] || [];
      items.forEach(item => {
        const checkboxId = `chk-manual-${jurisdiction}-${item.id}`;
        
        // Determine initial check state
        let isChecked = !!savedData[item.id];
        let isAutoDetected = false;

        // Apply auto-detection hints if applicable
        if (state && item.autoField) {
          if (item.autoField === 'hasDpo' && state.policyDeepScan?.hasDpo) {
            isChecked = true;
            isAutoDetected = true;
          } else if (item.autoField === 'hasTransparency' && state.policyDeepScan?.hasTransparency) {
            isChecked = true;
            isAutoDetected = true;
          } else if (item.autoField === 'hasRights' && state.policyDeepScan?.hasRights) {
            isChecked = true;
            isAutoDetected = true;
          } else if (item.autoField === 'equalButtons' && state.cmpRejectStatus === 'detected') {
            isChecked = true;
            isAutoDetected = true;
          }
        }

        const label = document.createElement('label');
        label.className = 'checklist-item manual-item';
        if (isAutoDetected) {
          label.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          label.style.background = 'rgba(16, 185, 129, 0.03)';
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.checked = isChecked;

        checkbox.addEventListener('change', async () => {
          savedData[item.id] = checkbox.checked;
          await chrome.storage.local.set({ [storageKey]: savedData });
          
          if (isAutoDetected && !checkbox.checked) {
            label.style.borderColor = 'var(--panel-border)';
            label.style.background = 'rgba(255, 255, 255, 0.02)';
          } else if (isAutoDetected && checkbox.checked) {
            label.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            label.style.background = 'rgba(16, 185, 129, 0.03)';
          }
        });

        const customBox = document.createElement('span');
        customBox.className = 'chk-box-custom';

        const content = document.createElement('div');
        content.className = 'chk-content';

        const title = document.createElement('div');
        title.className = 'chk-title';
        title.textContent = item.title;

        if (isAutoDetected) {
          const badge = document.createElement('span');
          badge.textContent = 'Auto';
          badge.style.fontSize = '8px';
          badge.style.fontWeight = 'bold';
          badge.style.marginLeft = '6px';
          badge.style.padding = '1px 4px';
          badge.style.borderRadius = '3px';
          badge.style.backgroundColor = 'var(--color-success-bg)';
          badge.style.color = 'var(--color-success)';
          badge.style.border = '1px solid var(--color-success-border)';
          badge.style.display = 'inline-block';
          badge.style.verticalAlign = 'middle';
          title.appendChild(badge);
        }

        const desc = document.createElement('div');
        desc.className = 'chk-desc';
        desc.textContent = item.desc;

        content.appendChild(title);
        content.appendChild(desc);

        label.appendChild(checkbox);
        label.appendChild(customBox);
        label.appendChild(content);

        container.appendChild(label);
      });
    });
  }

  // 6. Set Summary Banner Styles (Tab 1)
  function setSummaryState(type, title, desc) {
    complianceSummaryEl.className = 'summary-banner';
    
    if (type === 'neutral') {
      complianceSummaryEl.classList.add('alert-neutral');
      summaryIconEl.textContent = 'ℹ️';
    } else if (type === 'compliant') {
      complianceSummaryEl.classList.add('alert-compliant');
      summaryIconEl.textContent = '🛡️';
    } else if (type === 'warning') {
      complianceSummaryEl.classList.add('alert-warning');
      summaryIconEl.textContent = '⚠️';
    } else if (type === 'noncompliant') {
      complianceSummaryEl.classList.add('alert-noncompliant');
      summaryIconEl.textContent = '🛑';
    }
    
    summaryTitleEl.textContent = title;
    summaryDescEl.textContent = desc;
  }

  // 7. Render dynamic compliance metrics and tables
  function updateUI() {
    if (!tabState) return;
    btnExport.removeAttribute('disabled');

    const status = tabState.consentStatus;
    const jurisdiction = tabState.jurisdiction || 'GDPR';
    consentStatusEl.className = 'status-value';
    
    if (status === 'accepted') {
      consentStatusEl.textContent = 'Accepted';
      consentStatusEl.classList.add('val-accepted');
    } else if (status === 'rejected') {
      consentStatusEl.textContent = 'Rejected';
      consentStatusEl.classList.add('val-rejected');
    } else if (status === 'not_applicable') {
      consentStatusEl.textContent = 'N/A';
      consentStatusEl.classList.add('text-muted');
    } else {
      consentStatusEl.textContent = 'Unknown';
      consentStatusEl.classList.add('val-unknown');
    }

    // CMP standard
    const source = tabState.source;
    if (source) {
      cmpStandardEl.textContent = source === 'IAB_TCF' ? 'IAB TCF v2.2' : source;
      cmpBadgeEl.textContent = 'CMP Detected';
      cmpBadgeEl.className = 'badge badge-active';
    } else {
      cmpStandardEl.textContent = 'None Detected';
      cmpBadgeEl.textContent = 'No CMP Detected';
      cmpBadgeEl.className = 'badge badge-inactive';
    }

    // Violations lists
    const violations = tabState.violations || [];
    violationsCountEl.textContent = violations.length;

    violationsListEl.innerHTML = '';
    if (violations.length > 0) {
      violationsListEl.classList.remove('empty');

      const sortedViolations = [...violations].sort((a, b) => b.timestamp - a.timestamp);

      sortedViolations.forEach(v => {
        const card = document.createElement('div');
        card.className = 'violation-card';

        let badgeLabel = 'Pre-Consent';
        let badgeClass = 'v-badge-pre';

        if (v.type === 'POST_REJECTION') {
          badgeLabel = 'Post-Rejection';
          badgeClass = 'v-badge-post';
        } else if (v.type === 'GDPR_BYPASS') {
          badgeLabel = 'GDPR Bypass';
          badgeClass = 'v-badge-post';
        } else if (v.type === 'CCPA_BYPASS') {
          badgeLabel = 'CCPA Bypass';
          badgeClass = 'v-badge-post';
        } else if (v.type === 'ZZPL_BYPASS') {
          badgeLabel = 'ZZPL Bypass';
          badgeClass = 'v-badge-post';
        }

        card.innerHTML = `
          <div class="v-card-header">
            <span class="v-tracker-name">${escapeHtml(v.trackerName)}</span>
            <span class="v-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="v-card-body">
            <div class="v-url-row">
              <span class="v-url" title="${escapeHtml(v.url)}">${escapeHtml(v.url)}</span>
              <button class="btn-copy" data-url="${escapeHtml(v.url)}" title="Copy full URL">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="v-meta-row">
              <span class="v-initiator">Origin: ${escapeHtml(v.initiator)}</span>
              <span class="v-time">${formatTime(v.timestamp)}</span>
            </div>
          </div>
        `;
        violationsListEl.appendChild(card);
      });

      // Bind copy buttons
      const copyButtons = violationsListEl.querySelectorAll('.btn-copy');
      copyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const url = btn.getAttribute('data-url');
          navigator.clipboard.writeText(url).then(() => {
            const origColor = btn.style.color;
            btn.style.color = '#10b981';
            setTimeout(() => { btn.style.color = origColor; }, 1000);
          });
        });
      });

      // Compliance Summary Banner state (Tab 1)
      const hasBypass = violations.some(v => v.type.endsWith('_BYPASS'));
      if (hasBypass) {
        setSummaryState('noncompliant', `${jurisdiction} Non-Compliant`, `CMP bypassed consent rules, but strict ${jurisdiction} is enforced!`);
      } else if (status === 'rejected') {
        setSummaryState('noncompliant', `${jurisdiction} Non-Compliant`, `Trackers loaded after user explicitly rejected consent!`);
      } else {
        setSummaryState('noncompliant', `${jurisdiction} Non-Compliant`, 'Trackers loaded before user consent choice was made.');
      }

    } else {
      violationsListEl.classList.add('empty');
      
      violationsListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✓</div>
          <div class="empty-title">No violations detected</div>
          <div class="empty-desc">No tracking scripts have loaded illegally.</div>
        </div>
      `;

      if (status === 'accepted') {
        setSummaryState('compliant', `${jurisdiction} Compliant`, `All tracking scripts respected your ${jurisdiction} privacy choice.`);
      } else if (status === 'rejected') {
        setSummaryState('compliant', `${jurisdiction} Compliant`, `Trackers were successfully blocked after ${jurisdiction} rejection.`);
      } else if (status === 'not_applicable') {
        setSummaryState('compliant', `Compliant (N/A)`, `${jurisdiction} does not apply to this session.`);
      } else {
        setSummaryState('neutral', 'Auditing Page', 'No violations detected. Waiting for CMP choice...');
      }
    }

    // 8. TAB 2: Dynamic Compliance Checklist Population
    const checklistTexts = CHECKLIST_DATA[jurisdiction];
    if (checklistTexts) {
      checklistTitleEl.textContent = checklistTexts.title;
      groupTitlePolicy.textContent = checklistTexts.group_policy;
      groupTitleCookie.textContent = checklistTexts.group_cookie;
      groupTitleForms.textContent = checklistTexts.group_forms;
      groupTitleSecurity.textContent = checklistTexts.group_security;
    }

    // Jurisdiction detection subtext
    const auditMode = tabState.auditMode || 'auto';
    if (auditMode !== 'auto') {
      detectionInfoEl.textContent = `Strict Audit Profile active: Enforcing ${jurisdiction} standard rules.`;
      detectionInfoEl.parentElement.style.borderColor = 'rgba(56, 189, 248, 0.4)';
    } else {
      const reasons = [];
      if (tabDomain.endsWith('.me')) reasons.push('Montenegrin TLD (.me)');
      if (tabState.userCountry === 'ME') reasons.push('User IP in Montenegro');
      if (tabState.lang && ['me','sr','bs','hr','de','fr','es','it','pl','cs','sl','nl','be','sv','da'].includes(tabState.lang.toLowerCase().split('-')[0])) {
        reasons.push(`Language tag: ${tabState.lang}`);
      }
      
      if (reasons.length > 0) {
        detectionInfoEl.textContent = `Auto-Detected: ${jurisdiction} applies. Criteria: ${reasons.join(', ')}.`;
        detectionInfoEl.parentElement.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      } else {
        detectionInfoEl.textContent = `Auto-Detected: ${jurisdiction} rules applied. (User IP Country: ${tabState.userCountry || 'Unknown'}).`;
        detectionInfoEl.parentElement.style.borderColor = 'var(--panel-border)';
      }
    }

    // --- AUTOMATED DOM CHECKS (TAB 2) ---

    // 8a. Section 1: Privacy Policy Scanner
    const policyDescParagraph = checkPolicyExistsEl.nextElementSibling.querySelector('.chk-desc');
    if (tabState.privacyPolicyLink) {
      checkPolicyExistsEl.textContent = '✓';
      checkPolicyExistsEl.className = 'chk-status status-success';
      const cleanUrl = escapeHtml(tabState.privacyPolicyLink);
      const displayUrl = cleanUrl.length > 32 ? cleanUrl.substring(0, 29) + '...' : cleanUrl;
      policyDescParagraph.innerHTML = `<a href="${cleanUrl}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 600;">Found: ${displayUrl}</a>`;
      
      // If we also performed deep text scan, display scan feedback
      if (tabState.policyDeepScan) {
        const scan = tabState.policyDeepScan;
        const details = [];
        if (scan.hasDpo) details.push('DPO/Contacts');
        if (scan.hasTransparency) details.push('Transparency');
        if (scan.hasRights) details.push('User Rights');
        if (!scan.isPlainLanguage) details.push('⚠ High legalese');
        
        if (details.length > 0) {
          policyDescParagraph.innerHTML += `<div style="color: var(--text-secondary); font-size: 8px; margin-top: 3px; font-style: italic;">Scan findings: ${details.join(', ')}</div>`;
        }
      }
    } else {
      checkPolicyExistsEl.textContent = '✗';
      checkPolicyExistsEl.className = 'chk-status status-fail';
      policyDescParagraph.textContent = `No policy matching ${jurisdiction} keywords detected in links.`;
    }

    // Footer Check
    const footerDescParagraph = checkPolicyFooterEl.nextElementSibling.querySelector('.chk-desc');
    if (tabState.privacyPolicyLink) {
      if (tabState.policyInFooter) {
        checkPolicyFooterEl.textContent = '✓';
        checkPolicyFooterEl.className = 'chk-status status-success';
        footerDescParagraph.textContent = 'Passed: Policy link is placed in footer / bottom area.';
      } else {
        checkPolicyFooterEl.textContent = '⚠';
        checkPolicyFooterEl.className = 'chk-status status-warning';
        footerDescParagraph.textContent = 'Warning: Policy link found, but not placed in footer elements.';
      }
    } else {
      checkPolicyFooterEl.textContent = '✗';
      checkPolicyFooterEl.className = 'chk-status status-fail';
      footerDescParagraph.textContent = 'Failed: No policy link detected to verify position.';
    }

    // 8b. Section 2: Cookie Banner Scanner
    // Pre-Consent Block
    const cookieBlockDescParagraph = checkCookieBlockEl.nextElementSibling.querySelector('.chk-desc');
    const trackingViolations = violations.filter(v => v.type === 'PRE_CONSENT' || v.type.endsWith('_BYPASS'));
    if (trackingViolations.length > 0) {
      checkCookieBlockEl.textContent = '✗';
      checkCookieBlockEl.className = 'chk-status status-fail';
      cookieBlockDescParagraph.textContent = `Failed: ${trackingViolations.length} tracking requests loaded before consent.`;
    } else {
      checkCookieBlockEl.textContent = '✓';
      checkCookieBlockEl.className = 'chk-status status-success';
      cookieBlockDescParagraph.textContent = 'Passed: Tracking scripts were blocked before consent.';
    }

    // Reject All Button
    const rejectDescParagraph = checkCookieRejectEl.nextElementSibling.querySelector('.chk-desc');
    const rejectStatus = tabState.cmpRejectStatus || 'no_cmp';
    if (rejectStatus === 'detected') {
      checkCookieRejectEl.textContent = '✓';
      checkCookieRejectEl.className = 'chk-status status-success';
      rejectDescParagraph.textContent = 'Passed: "Reject All" button detected on the first layer.';
    } else if (rejectStatus === 'unequal') {
      checkCookieRejectEl.textContent = '⚠';
      checkCookieRejectEl.className = 'chk-status status-warning';
      rejectDescParagraph.textContent = 'Warning: "Reject All" is styled unequally (size/color contrast dark pattern).';
    } else if (rejectStatus === 'missing') {
      checkCookieRejectEl.textContent = '✗';
      checkCookieRejectEl.className = 'chk-status status-fail';
      rejectDescParagraph.textContent = 'Failed: Dark Pattern! "Reject All" is missing from first layer.';
    } else {
      checkCookieRejectEl.textContent = '⚠';
      checkCookieRejectEl.className = 'chk-status status-warning';
      rejectDescParagraph.textContent = 'Warning: No standard cookie banner detected in DOM.';
    }

    // 8c. Section 3: Forms & Data Collection
    // Active Opt-In Check (no precheck)
    const precheckedDescParagraph = checkFormPrecheckedEl.nextElementSibling.querySelector('.chk-desc');
    const precheckedStatus = tabState.preCheckedCheckboxes;
    if (precheckedStatus === 'no_forms') {
      checkFormPrecheckedEl.textContent = '—';
      checkFormPrecheckedEl.className = 'chk-status status-loading';
      precheckedDescParagraph.textContent = 'N/A: No data submission forms detected on the page.';
    } else if (precheckedStatus === 'no_checkboxes') {
      checkFormPrecheckedEl.textContent = '✓';
      checkFormPrecheckedEl.className = 'chk-status status-success';
      precheckedDescParagraph.textContent = 'Passed: Forms found, but contain no checkbox inputs.';
    } else if (precheckedStatus === true) {
      checkFormPrecheckedEl.textContent = '✗';
      checkFormPrecheckedEl.className = 'chk-status status-fail';
      precheckedDescParagraph.textContent = 'Failed: Pre-ticked checkbox found! Violates active opt-in rules.';
    } else {
      checkFormPrecheckedEl.textContent = '✓';
      checkFormPrecheckedEl.className = 'chk-status status-success';
      precheckedDescParagraph.textContent = 'Passed: All form checkboxes are blank by default.';
    }

    // Form Policy Link Check
    const formLinkDescParagraph = checkFormLinkEl.nextElementSibling.querySelector('.chk-desc');
    const formLinkStatus = tabState.hasFormPolicyLink;
    if (formLinkStatus === 'no_forms') {
      checkFormLinkEl.textContent = '—';
      checkFormLinkEl.className = 'chk-status status-loading';
      formLinkDescParagraph.textContent = 'N/A: No data submission forms detected on the page.';
    } else if (formLinkStatus === true) {
      checkFormLinkEl.textContent = '✓';
      checkFormLinkEl.className = 'chk-status status-success';
      formLinkDescParagraph.textContent = 'Passed: Policy link is present inside the form.';
    } else {
      checkFormLinkEl.textContent = '✗';
      checkFormLinkEl.className = 'chk-status status-fail';
      formLinkDescParagraph.textContent = 'Failed: Forms do not contain a link to the privacy rules.';
    }

    // Form Data Minimization Check
    const minimizationDescParagraph = checkFormMinimizationEl.nextElementSibling.querySelector('.chk-desc');
    const minimizationStatus = tabState.dataMinimizationStatus;
    if (minimizationStatus === 'no_forms') {
      checkFormMinimizationEl.textContent = '—';
      checkFormMinimizationEl.className = 'chk-status status-loading';
      minimizationDescParagraph.textContent = 'N/A: No data submission forms detected.';
    } else if (minimizationStatus === 'failed') {
      checkFormMinimizationEl.textContent = '✗';
      checkFormMinimizationEl.className = 'chk-status status-fail';
      minimizationDescParagraph.textContent = 'Failed: Subscription form requires a phone number or address.';
    } else if (minimizationStatus === 'warning') {
      checkFormMinimizationEl.textContent = '⚠';
      checkFormMinimizationEl.className = 'chk-status status-warning';
      minimizationDescParagraph.textContent = 'Warning: Form requests a mandatory physical address or birthdate.';
    } else {
      checkFormMinimizationEl.textContent = '✓';
      checkFormMinimizationEl.className = 'chk-status status-success';
      minimizationDescParagraph.textContent = 'Passed: Forms do not request excessive mandatory inputs.';
    }

    // 8d. Section 4: Technical Security Check (HTTPS)
    const httpsDescParagraph = checkSecurityHttpsEl.nextElementSibling.querySelector('.chk-desc');
    if (tabState.isHttps) {
      checkSecurityHttpsEl.textContent = '✓';
      checkSecurityHttpsEl.className = 'chk-status status-success';
      httpsDescParagraph.textContent = 'Passed: Site uses secure SSL/TLS HTTPS protocol.';
    } else {
      checkSecurityHttpsEl.textContent = '✗';
      checkSecurityHttpsEl.className = 'chk-status status-fail';
      httpsDescParagraph.textContent = 'Failed: Unencrypted HTTP! Violates basic security rules.';
    }

    // Render granular manual checklists
    renderManualChecklist(jurisdiction, tabDomain, tabState);
  }

  // 9. Reset action (Reload tab and clear session storage)
  btnReset.addEventListener('click', async () => {
    if (!activeTab || !activeTab.url) return;

    // Show visual indicator that we are clearing data
    const originalHTML = btnReset.innerHTML;
    btnReset.disabled = true;
    btnReset.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      Clearing...
    `;

    try {
      if (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://')) {
        let hostname = '';
        try {
          hostname = new URL(activeTab.url).hostname;
        } catch (e) {
          console.error('[GDPR Audit] Invalid URL parsing:', e);
        }

        if (hostname) {
          // 9a. Clear cookies for the active domain, parent domains, and similar brand domains (e.g. idealo.de when on idealo.it)
          const parts = hostname.split('.');
          const isIpOrLocal = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost';
          
          let brandName = '';
          if (!isIpOrLocal && parts.length >= 2) {
            const commonSlds = ['com', 'co', 'net', 'org', 'gov', 'edu', 'mil', 'ltd', 'plc', 'me'];
            if (parts.length >= 3 && commonSlds.includes(parts[parts.length - 2])) {
              brandName = parts[parts.length - 3];
            } else {
              brandName = parts[parts.length - 2];
            }
          }

          const removedCookieKeys = new Set();
          try {
            const allCookies = await chrome.cookies.getAll({});
            for (const cookie of allCookies) {
              const cookieDomain = cookie.domain.toLowerCase();
              
              // Check if cookie belongs to active host variations, or contains brand name (e.g., idealo) or CMP names
              let shouldDelete = false;
              if (isIpOrLocal) {
                shouldDelete = cookieDomain.includes(hostname);
              } else {
                // Delete if it matches host variations
                for (let i = 0; i < parts.length - 1; i++) {
                  const dom = parts.slice(i).join('.');
                  // Skip top-level suffixes like .co.uk
                  const subParts = dom.split('.');
                  if (subParts.length === 2) {
                    const sld = subParts[0];
                    const commonSldsList = ['com', 'co', 'net', 'org', 'gov', 'edu', 'mil', 'ltd', 'plc', 'me'];
                    if (commonSldsList.includes(sld)) continue;
                  }
                  if (cookieDomain === dom || cookieDomain === '.' + dom) {
                    shouldDelete = true;
                    break;
                  }
                }
                
                // Or if it contains our brand name (e.g., idealo.de, idealo.it)
                if (!shouldDelete && brandName && brandName.length > 2 && cookieDomain.includes(brandName)) {
                  shouldDelete = true;
                }
                
                // Or if it contains common CMP domains
                if (!shouldDelete) {
                  const cmpKeywords = ['usercentrics', 'onetrust', 'cookiebot', 'cookiechoices', 'didomi', 'ketch'];
                  for (const kw of cmpKeywords) {
                    if (cookieDomain.includes(kw)) {
                      shouldDelete = true;
                      break;
                    }
                  }
                }
              }

              if (shouldDelete) {
                const cookieKey = `${cookie.name}|${cookie.domain}|${cookie.path}|${cookie.storeId}`;
                if (removedCookieKeys.has(cookieKey)) continue;
                removedCookieKeys.add(cookieKey);

                // Use HTTPS if the tab is HTTPS, or if the cookie requires secure connection, to ensure authority to delete
                const protocol = (cookie.secure || activeTab.url.startsWith('https:')) ? "https://" : "http://";
                const domainPart = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                const url = protocol + domainPart + cookie.path;
                
                try {
                  await chrome.cookies.remove({
                    url: url,
                    name: cookie.name,
                    storeId: cookie.storeId
                  });
                } catch (cookieErr) {
                  console.error(`[GDPR Audit] Failed to remove cookie ${cookie.name} for URL ${url}:`, cookieErr);
                }
              }
            }
          } catch (cookieQueryErr) {
            console.error('[GDPR Audit] Failed to query all cookies:', cookieQueryErr);
          }
        }

        // 9b. Clear site storage (localStorage, sessionStorage, indexedDB, cache) via script injection in ALL frames (including CMP iframe)
        try {
          await chrome.scripting.executeScript({
            target: { 
              tabId: activeTab.id,
              allFrames: true
            },
            func: () => {
              try { localStorage.clear(); } catch (e) {}
              try { sessionStorage.clear(); } catch (e) {}
              try {
                if (window.indexedDB && window.indexedDB.databases) {
                  window.indexedDB.databases().then(dbs => {
                    dbs.forEach(db => {
                      try { window.indexedDB.deleteDatabase(db.name); } catch (err) {}
                    });
                  }).catch(() => {});
                }
              } catch (e) {}
              try {
                if (window.caches && window.caches.keys) {
                  window.caches.keys().then(keys => {
                    keys.forEach(key => {
                      try { window.caches.delete(key); } catch (err) {}
                    });
                  }).catch(() => {});
                }
              } catch (e) {}
            }
          });
        } catch (scriptErr) {
          console.warn('[GDPR Audit] Script execution failed (expected on browser/system pages):', scriptErr);
        }
      }
    } catch (err) {
      console.error('[GDPR Audit] Error during reset sequence:', err);
    }

    // 9c. Reset tab state in session storage
    const key = `tab_${activeTab.id}`;
    const selectedMode = auditModeSelect.value;
    
    const freshState = {
      consentStatus: 'unknown',
      source: null,
      violations: [],
      isHttps: activeTab.url.startsWith('https:'),
      privacyPolicyLink: null,
      jurisdiction: resolveJurisdiction(activeTab.url, tabState?.lang, selectedMode),
      lang: tabState?.lang,
      userCountry: tabState?.userCountry,
      auditMode: selectedMode,
      policyInFooter: false,
      preCheckedCheckboxes: false,
      hasFormPolicyLink: false,
      cmpRejectStatus: 'no_cmp',
      policyDeepScan: null
    };
    await chrome.storage.session.set({ [key]: freshState });

    try {
      await chrome.action.setBadgeText({ tabId: activeTab.id, text: '' });
    } catch (e) {}

    // Reload the active tab
    chrome.tabs.reload(activeTab.id);

    // Restore button appearance after short delay to let the page reload begin
    setTimeout(() => {
      btnReset.disabled = false;
      btnReset.innerHTML = originalHTML;
    }, 800);
  });

  // Local jurisdiction solver helper
  function resolveJurisdiction(urlStr, lang, auditMode) {
    if (auditMode === 'gdpr') return 'GDPR';
    if (auditMode === 'ccpa') return 'CCPA';
    if (auditMode === 'zzpl') return 'ZZPL';

    try {
      const url = new URL(urlStr);
      if (url.hostname.endsWith('.me') || tabState?.userCountry === 'ME') return 'ZZPL';
      if (lang) {
        const clean = lang.toLowerCase().split('-')[0];
        if (['me','sr','bs','hr'].includes(clean)) return 'ZZPL';
      }
    } catch (e) {}
    return null;
  }

  // 10. Bind Selector dropdown changes
  auditModeSelect.addEventListener('change', async () => {
    const selectedMode = auditModeSelect.value;
    await chrome.storage.local.set({ globalAuditMode: selectedMode });
    
    if (activeTab) {
      const key = `tab_${activeTab.id}`;
      const freshState = {
        consentStatus: 'unknown',
        source: null,
        violations: [],
        isHttps: activeTab.url.startsWith('https:'),
        privacyPolicyLink: null,
        jurisdiction: resolveJurisdiction(activeTab.url, tabState?.lang, selectedMode),
        lang: tabState?.lang,
        userCountry: tabState?.userCountry,
        auditMode: selectedMode,
        policyInFooter: false,
        preCheckedCheckboxes: false,
        hasFormPolicyLink: false,
        cmpRejectStatus: 'no_cmp',
        policyDeepScan: null
      };
      await chrome.storage.session.set({ [key]: freshState });

      try {
        await chrome.action.setBadgeText({ tabId: activeTab.id, text: '' });
      } catch (e) {}
      
      chrome.tabs.reload(activeTab.id);
    }
  });

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
    } else if (technicalAudits.cmpRejectButtonStatus === 'missing' || technicalAudits.cmpRejectButtonStatus === 'unequal' || !technicalAudits.privacyPolicyLink || technicalAudits.dataMinimizationStatus === 'failed') {
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
      { name: "Blank Checkbox Inputs (Opt-in)", val: technicalAudits.preCheckedCheckboxesStatus !== true, desc: "Verifies forms contain no pre-checked consent checkboxes." },
      { name: "Privacy Policy Link in Forms", val: technicalAudits.formPolicyLinkStatus === true, desc: "Checks if submission forms contain a policy link next to submit buttons." },
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
      
      checksCards += `
        <div class="checklist-card ${statusClass}">
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
          if (jData && jData.manual_items) {
            for (const grp of Object.values(jData.manual_items)) {
              const match = grp.find(item => item.id === k);
              if (match) {
                title = match.title;
                desc = match.desc;
                break;
              }
            }
          }

          manualCards += `
            <div class="checklist-card ${statusClass}">
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
          <h4>1. Fix Illegal Tracker Initialization (Immediate Action Required)</h4>
          <p>The auditor detected tracking scripts or cookies initializing before consent was given (Pre-Consent) or after the user declined consent (Post-Rejection). This directly violates Article 7 of GDPR / Section 1798.120 of CCPA.</p>
          <h5>Remediation Instructions for Developers:</h5>
          <ul>
            <li><strong>GTM Consent Mode</strong>: Enable Tag Manager "Consent Settings". Do not fire Google Analytics, Facebook Pixel, or TikTok tags until <code>analytics_storage</code> or <code>ad_storage</code> is granted.</li>
            <li><strong>Script Tag Wrapping</strong>: Modify direct script tags on the page to prevent automatic load:
              <pre><code><span class="comment">&lt;!-- Change this: --&gt;</span>
&lt;<span class="tag">script</span> <span class="attr">src</span>=<span class="val">"https://example-tracker.com/pixel.js"</span>&gt;&lt;/<span class="tag">script</span>&gt;

<span class="comment">&lt;!-- To this (CMP wrapper style): --&gt;</span>
&lt;<span class="tag">script</span> <span class="attr">type</span>=<span class="val">"text/plain"</span> <span class="attr">class</span>=<span class="val">"_cm_script"</span> <span class="attr">data-consent</span>=<span class="val">"marketing"</span> <span class="attr">src</span>=<span class="val">"https://example-tracker.com/pixel.js"</span>&gt;&lt;/<span class="tag">script</span>&gt;</code></pre>
            </li>
            <li><strong>Server-side Cookies</strong>: Ensure server-side set-cookie headers (like <code>IDE</code>, <code>_fbp</code>, <code>_ga</code>) are not sent on initial load before the user makes a choice.</li>
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
        <span class="meta-value"><span class="grade-badge ${gradeClass}">${gradeDesc} (${grade})</span></span>
      </div>
    </div>

    <div class="report-body">
      
      <!-- Summary Block -->
      <div class="status-summary-block block-${grade.toLowerCase()}">
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

</body>
</html>`;
  }

  // 11. Export HTML Compliance Report
  btnExport.addEventListener('click', async () => {
    if (!tabState) return;
    
    const jurisdiction = tabState.jurisdiction || 'GDPR';
    
    // Dynamically retrieve manual checklist selections from UI elements
    const manualValues = {};
    const checklistTexts = CHECKLIST_DATA[jurisdiction];
    if (checklistTexts && checklistTexts.manual_items) {
      Object.keys(checklistTexts.manual_items).forEach(groupKey => {
        checklistTexts.manual_items[groupKey].forEach(item => {
          const checkbox = document.getElementById(`chk-manual-${jurisdiction}-${item.id}`);
          manualValues[item.id] = checkbox ? checkbox.checked : false;
        });
      });
    }

    const exportData = {
      auditTimestamp: Date.now(),
      domain: tabDomain,
      selectedAuditMode: tabState.auditMode,
      resolvedJurisdiction: jurisdiction,
      consentStatus: tabState.consentStatus,
      cmpStandard: tabState.source,
      technicalAudits: {
        isHttpsSecure: tabState.isHttps,
        privacyPolicyLink: tabState.privacyPolicyLink,
        policyInFooter: tabState.policyInFooter,
        pageLanguage: tabState.lang,
        preConsentBlocked: !tabState.violations.some(v => v.type === 'PRE_CONSENT' || v.type.endsWith('_BYPASS')),
        cmpRejectButtonStatus: tabState.cmpRejectStatus,
        preCheckedCheckboxesStatus: tabState.preCheckedCheckboxes,
        formPolicyLinkStatus: tabState.hasFormPolicyLink,
        dataMinimizationStatus: tabState.dataMinimizationStatus
      },
      manualChecklist: {
        jurisdiction: jurisdiction,
        selections: manualValues
      },
      policyDeepScan: tabState.policyDeepScan,
      violationsCount: tabState.violations.length,
      violations: tabState.violations,
      userCountry: tabState.userCountry
    };

    const reportHtml = generateHtmlReport(exportData);
    const dataStr = "data:text/html;charset=utf-8," + encodeURIComponent(reportHtml);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `privacy_report_${jurisdiction.toLowerCase()}_${tabDomain.replace(/\./g, '_')}.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // 12. Side Panel Listeners for switches and changes
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await init();
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (activeTab && tabId === activeTab.id && changeInfo.status === 'loading') {
      await init();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'session' && activeTab) {
      const key = `tab_${activeTab.id}`;
      if (changes[key]) {
        tabState = changes[key].newValue || { 
          consentStatus: 'unknown', 
          source: null, 
          violations: [], 
          isHttps: false, 
          privacyPolicyLink: null, 
          jurisdiction: null, 
          lang: null, 
          userCountry: null, 
          auditMode: 'auto', 
          policyInFooter: false, 
          preCheckedCheckboxes: false, 
          hasFormPolicyLink: false, 
          cmpRejectStatus: 'no_cmp',
          policyDeepScan: null
        };
        updateUI();
      }
    }
    // Update rules status panel if rules cache changes
    if (areaName === 'local' && (changes.rules_updated_at || changes.cmp_selectors_remote || changes.tracker_rules_remote)) {
      loadRulesStatus();
    }
  });

  // 13. Rules Database Panel
  const rulesStatusText = document.getElementById('rules-status-text');
  const btnUpdateRules = document.getElementById('btn-update-rules');
  const updateRulesIcon = document.getElementById('update-rules-icon');

  function formatRulesDate(timestamp) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffH < 1) return 'Updated just now';
    if (diffH < 24) return `Updated ${diffH}h ago`;
    if (diffD === 1) return 'Updated yesterday';
    if (diffD < 7) return `Updated ${diffD}d ago`;
    return `Updated ${date.toLocaleDateString()}`;
  }

  async function loadRulesStatus() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_RULES_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          rulesStatusText.textContent = 'Not yet fetched';
          rulesStatusText.className = 'rules-meta';
          return;
        }
        const { updatedAt, cmpCount, trackerCount } = response;
        if (!updatedAt) {
          rulesStatusText.textContent = 'Fetching on first use...';
          rulesStatusText.className = 'rules-meta';
        } else {
          const dateStr = formatRulesDate(updatedAt);
          rulesStatusText.textContent = `${dateStr} · ${cmpCount} CMP · ${trackerCount} trackers`;
          rulesStatusText.className = 'rules-meta status-ok';
        }
      });
    } catch (e) {
      rulesStatusText.textContent = 'Status unavailable';
      rulesStatusText.className = 'rules-meta status-error';
    }
  }

  if (btnUpdateRules) {
    btnUpdateRules.addEventListener('click', async () => {
      if (btnUpdateRules.disabled) return;
      btnUpdateRules.disabled = true;
      updateRulesIcon.classList.add('spinning');
      rulesStatusText.textContent = 'Fetching from GitHub...';
      rulesStatusText.className = 'rules-meta status-updating';

      try {
        chrome.runtime.sendMessage({ type: 'FORCE_RULES_UPDATE' }, (response) => {
          updateRulesIcon.classList.remove('spinning');
          btnUpdateRules.disabled = false;
          if (chrome.runtime.lastError || !response) {
            rulesStatusText.textContent = 'Update failed — check connection';
            rulesStatusText.className = 'rules-meta status-error';
            return;
          }
          if (response.status === 'updated') {
            rulesStatusText.textContent = `Updated now · ${response.cmpCount} CMP · ${response.trackerCount} trackers`;
            rulesStatusText.className = 'rules-meta status-ok';
          } else if (response.status === 'partial') {
            rulesStatusText.textContent = `Partial update · ${response.errors ? response.errors.join(', ') : ''}`;
            rulesStatusText.className = 'rules-meta status-error';
          } else {
            rulesStatusText.textContent = 'Update failed — try again';
            rulesStatusText.className = 'rules-meta status-error';
          }
        });
      } catch (e) {
        updateRulesIcon.classList.remove('spinning');
        btnUpdateRules.disabled = false;
        rulesStatusText.textContent = 'Update error';
        rulesStatusText.className = 'rules-meta status-error';
      }
    });
  }

  // Load rules status on panel open
  loadRulesStatus();

  // Initialize Panel
  init();
});

