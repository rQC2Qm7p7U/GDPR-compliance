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
            id: 'data_minimization',
            title: 'Data Minimization Rules',
            desc: 'Input fields only request data strictly necessary to fulfill the request (no bloated signups) (Art. 5).'
          },
          {
            id: 'separate_consent',
            title: 'No Bundled Marketing Consent',
            desc: 'Registration/checkout forms do not bundle marketing opt-ins. Marketing consent is separate.'
          }
        ],
        security: [
          {
            id: 'encrypted_db',
            title: 'Server-side Encryption',
            desc: 'Customer databases utilize server-side encryption at rest and active access restrictions (Art. 32).'
          },
          {
            id: 'erasure_mechanism',
            title: 'Swift Erasure Workflow',
            desc: 'An automated or manual rapid workflow is ready to delete user data across all tables on request (Art. 17).'
          }
        ]
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
            id: 'data_minimization',
            title: 'Purpose Limitation',
            desc: 'Notice at collection is displayed at or before the point of data entry in any input form.'
          },
          {
            id: 'separate_consent',
            title: 'Right to Limit Opt-in',
            desc: 'Forms do not automatically share sensitive personal info without explicit warning/consent.'
          }
        ],
        security: [
          {
            id: 'encrypted_db',
            title: 'Secure California Data',
            desc: 'Reasonable security policies are maintained to safeguard personal information from breach.'
          },
          {
            id: 'erasure_mechanism',
            title: 'Propagation of Erasure',
            desc: 'Workflow is established to propagate deletion requests downstream to service providers.'
          }
        ]
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
            id: 'data_minimization',
            title: 'Minimalan obim obrade (čl. 3)',
            desc: 'Obrađuju se samo podaci koji su neophodni za ostvarivanje namjene obrade.'
          },
          {
            id: 'separate_consent',
            title: 'Poseban pristanak za marketing',
            desc: 'Saglasnost na uslove korišćenja ne daje pravo na automatsko slanje marketinških poruka.'
          }
        ],
        security: [
          {
            id: 'encrypted_db',
            title: 'Registracija zbirke u AZLP',
            desc: 'Zbirka ličnih podataka i njena struktura su prijavljeni Agenciji za zaštitu ličnih podataka.'
          },
          {
            id: 'erasure_mechanism',
            title: 'Brisanje iz zbirke na zahtjev',
            desc: 'Uspostavljen proces u bazi podataka za uklanjanje lica iz zbirke i prestanak obrade (čl. 24a).'
          }
        ]
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
          [checkPolicyExistsEl, checkPolicyFooterEl, checkCookieBlockEl, checkCookieRejectEl, checkFormPrecheckedEl, checkFormLinkEl, checkSecurityHttpsEl].forEach(el => {
            el.textContent = '⏳';
            el.className = 'chk-status status-loading';
          });
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
      policyDeepScan: null
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
      btnExport.removeAttribute('disabled');

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
      btnExport.setAttribute('disabled', 'true');
      
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

  // 11. Export JSON Compliance Report
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
        formPolicyLinkStatus: tabState.hasFormPolicyLink
      },
      manualChecklist: {
        jurisdiction: jurisdiction,
        selections: manualValues
      },
      policyDeepScan: tabState.policyDeepScan,
      violationsCount: tabState.violations.length,
      violations: tabState.violations
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `privacy_report_${jurisdiction.toLowerCase()}_${tabDomain.replace(/\./g, '_')}.json`);
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

