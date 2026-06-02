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
