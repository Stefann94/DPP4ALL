// Regulatory catalogue per product category. Single source for the "Am nevoie de DPP?" checker,
// the deadlines timeline and (later) the category templates. Status rules:
//  in_force  = applies today            (badge: Obligatoriu acum)
//  adopted   = law adopted, future date  (badge: Lege adoptată)
//  indicative= Commission planning only, no delegated act adopted — NEVER shown as a firm deadline.
// Sources: research report "Platforme DPP și cerințe pe categorii" (Nov 2026). Items marked `verify` need an OJ check.

export type ObligationStatus = 'in_force' | 'adopted' | 'indicative' | 'pending';
export type Role = 'importer' | 'distributor' | 'brand' | 'marketplace';

export interface Obligation {
  title: string;
  detail: string;
  status: ObligationStatus;
  date?: string;            // ISO date; for indicative use the expected year/quarter start
  dateLabel?: string;       // human label when the date is approximate (e.g. "~2029")
  law: string;              // short legal reference
  url: string;              // official source
  b2cOnly?: boolean;        // only when selling to consumers
  subtypes?: string[];      // e.g. battery subtypes it applies to
  verify?: boolean;         // needs checking against the Official Journal
}

export interface CategoryReg {
  id: string;
  name: string;
  icon: string;             // Icon name
  family: 'item' | 'model_eprel' | 'doc' | 'general';
  badge: string;            // short status for the categories grid
  subtypes?: { id: string; label: string }[];
  obligations: Obligation[];
  documents: string[];      // what to request from the factory
}

const ELI = (type: 'reg' | 'dir', y: number, n: number) => `https://eur-lex.europa.eu/eli/${type}/${y}/${n}/oj`;
const DPP_PAGE = 'https://single-market-economy.ec.europa.eu/single-market/digital-product-passport_en';

const GPSR: Obligation = {
  title: 'Identificare și siguranță (GPSR)', status: 'in_force', date: '2024-12-13', law: 'Reg. (UE) 2023/988', url: ELI('reg', 2023, 988), b2cOnly: true,
  detail: 'Tip, lot sau serie pe produs; datele producătorului și ale importatorului; avertismente în limba țării; aceleași date în anunțul online (Art. 19).',
};

export const CATEGORIES: CategoryReg[] = [
  {
    id: 'baterii', name: 'Baterii', icon: 'battery', family: 'item', badge: 'Obligatoriu 2027',
    subtypes: [
      { id: 'lmt', label: 'Transport ușor (e-bike, trotinetă)' },
      { id: 'ev', label: 'Vehicul electric' },
      { id: 'industrial', label: 'Industrială / stocare > 2 kWh' },
      { id: 'portable', label: 'Portabilă, SLI sau ≤ 2 kWh' },
    ],
    obligations: [
      GPSR,
      { title: 'Pașaportul bateriei, pentru fiecare bucată', status: 'adopted', date: '2027-02-18', law: 'Reg. (UE) 2023/1542, Art. 77', url: ELI('reg', 2023, 1542), subtypes: ['lmt', 'ev', 'industrial'],
        detail: 'Pașaport per baterie, cu cod QR și 3 niveluri de acces: public, interes legitim, autorități.' },
      { title: 'Cod QR pe toate bateriile', status: 'adopted', date: '2027-02-18', law: 'Reg. (UE) 2023/1542, Art. 13(6)', url: ELI('reg', 2023, 1542),
        detail: 'Codul QR duce la informațiile despre baterie: declarația de conformitate, colectare, siguranță.' },
      { title: 'Due diligence pe lanțul de aprovizionare', status: 'adopted', date: '2027-08-18', law: 'Reg. (UE) 2025/1561', url: ELI('reg', 2025, 1561), subtypes: ['lmt', 'ev', 'industrial'],
        detail: 'Pentru operatori cu cifră de afaceri peste 40 mil. EUR. Raportul alimentează pașaportul.' },
      { title: 'Înregistrare în registrul UE', status: 'pending', law: 'Reg. de punere în aplicare (UE) 2026/1778', url: DPP_PAGE, subtypes: ['lmt', 'ev', 'industrial'],
        detail: 'Registrul funcționează din 20.07.2026, dar bateriile pot fi înregistrate abia după ce Comisia publică catalogul de date.' },
    ],
    documents: ['Declarația UE de conformitate', 'Raport UN 38.3 (transport)', 'IEC 62133 / IEC 62619', 'Fișa tehnică (capacitate, tensiuni, cicluri)', 'Fișa cu date de securitate (SDS)', 'Compoziția chimică și materiile prime critice'],
  },
  {
    id: 'gpsr', name: 'Orice produs de consum', icon: 'shield', family: 'general', badge: 'Obligatoriu acum',
    obligations: [
      GPSR,
      { title: 'Persoană responsabilă în UE', status: 'in_force', date: '2024-12-13', law: 'Reg. (UE) 2023/988, Art. 16', url: ELI('reg', 2023, 988), b2cOnly: true,
        detail: 'Un operator stabilit în UE (de regulă importatorul) trebuie numit pe produs sau pe ambalaj.' },
    ],
    documents: ['Documentație tehnică și analiza riscurilor', 'Instrucțiuni și avertismente în română', 'Fotografii cu etichetele'],
  },
  {
    id: 'electronice', name: 'Electronice și electrocasnice', icon: 'pulse', family: 'model_eprel', badge: 'EPREL azi · DPP ~2029',
    obligations: [
      GPSR,
      { title: 'Etichetă energetică și EPREL (telefoane, tablete, electrocasnice)', status: 'in_force', date: '2025-06-20', law: 'Reg. (UE) 2023/1669 și 2023/1670', url: ELI('reg', 2023, 1669), verify: true,
        detail: 'Telefoanele și tabletele au clasă de reparabilitate și sunt înregistrate în EPREL.' },
      { title: 'Cerințe de reparabilitate', status: 'indicative', dateLabel: '~2027 (adoptare)', law: 'ESPR (UE) 2024/1781', url: DPP_PAGE,
        detail: 'Consultare deschisă până în 9.02.2027. Fără act delegat adoptat.' },
      { title: 'Pașaport digital ICT / electronice', status: 'indicative', dateLabel: '~2029', law: 'ESPR (UE) 2024/1781 — plan de lucru', url: DPP_PAGE,
        detail: 'Dată orientativă din planul Comisiei. Obligația începe la min. 18 luni după actul delegat.' },
    ],
    documents: ['Declarația UE de conformitate (LVD, EMC, RED)', 'Raport RoHS', 'Declarație REACH (SVHC)', 'Date pentru eticheta energetică', 'Manual în română'],
  },
  {
    id: 'jucarii', name: 'Jucării', icon: 'sparkle', family: 'doc', badge: 'Obligatoriu 2030',
    obligations: [
      GPSR,
      { title: 'Pașaportul jucăriei (înlocuiește declarația de conformitate)', status: 'adopted', date: '2030-08-01', law: 'Reg. (UE) 2025/2509', url: ELI('reg', 2025, 2509),
        detail: 'Importatorul verifică existența pașaportului; vama îl verifică în registru.' },
    ],
    documents: ['Rapoarte EN 71 (părțile 1–3 și altele aplicabile)', 'Declarația UE de conformitate', 'Lista substanțelor chimice', 'Avertismente și vârsta minimă'],
  },
  {
    id: 'textile', name: 'Textile și încălțăminte', icon: 'tag', family: 'item', badge: 'EPR 2028 · DPP ~2029',
    obligations: [
      GPSR,
      { title: 'Etichetarea compoziției fibrelor', status: 'in_force', date: '2012-05-08', law: 'Reg. (UE) 1007/2011', url: ELI('reg', 2011, 1007),
        detail: 'Compoziția în fibre, în limba țării de vânzare.' },
      { title: 'Scheme de răspundere extinsă a producătorului (EPR) pentru textile', status: 'adopted', date: '2028-04-17', law: 'Dir. (UE) 2025/1892', url: ELI('dir', 2025, 1892),
        detail: 'Înregistrare și contribuție în fiecare stat membru unde vindeți.' },
      { title: 'Pașaport digital textile', status: 'indicative', dateLabel: '~2029', law: 'ESPR (UE) 2024/1781 — plan de lucru', url: DPP_PAGE,
        detail: 'Act delegat așteptat ~2027; aplicare la min. 18 luni după.' },
    ],
    documents: ['Compoziția în fibre (%)', 'Teste REACH (azo, PFAS, metale)', 'Țara de origine pe etape', 'Instrucțiuni de întreținere'],
  },
  {
    id: 'mobilier', name: 'Mobilier și saltele', icon: 'dashboard', family: 'model_eprel', badge: 'DPP ~2030',
    obligations: [GPSR, { title: 'Pașaport digital mobilier', status: 'indicative', dateLabel: '~2030', law: 'ESPR (UE) 2024/1781 — plan de lucru', url: DPP_PAGE, detail: 'Act delegat așteptat ~2028.' }],
    documents: ['Lista materialelor', 'Teste de stabilitate și rezistență', 'Emisii (formaldehidă)', 'Instrucțiuni de montaj'],
  },
  {
    id: 'constructii', name: 'Materiale de construcții', icon: 'settings', family: 'doc', badge: 'DPP ~2028–29',
    obligations: [
      { title: 'Noul Regulament privind produsele pentru construcții', status: 'in_force', date: '2026-01-08', law: 'Reg. (UE) 2024/3110', url: ELI('reg', 2024, 3110), detail: 'Declarația de performanță și conformitate.' },
      { title: 'Pașaport digital pentru produse de construcții', status: 'indicative', dateLabel: '~2028–29', law: 'Reg. (UE) 2024/3110 — act delegat', url: ELI('reg', 2024, 3110), detail: 'Act delegat așteptat ~2027, apoi 18 luni.' },
    ],
    documents: ['Declarația de performanță', 'Certificat de constanță a performanței', 'Fișa tehnică'],
  },
  {
    id: 'detergenti', name: 'Detergenți', icon: 'recycle', family: 'doc', badge: 'Obligatoriu 2029',
    obligations: [
      { title: 'Pașaport digital pentru detergenți', status: 'adopted', date: '2029-09-23', law: 'Reg. (UE) 2026/405', url: ELI('reg', 2026, 405), detail: 'Pașaport obligatoriu; eticheta digitală e opțională.' },
    ],
    documents: ['Lista ingredientelor', 'Fișa cu date de securitate (SDS)', 'Teste de biodegradabilitate'],
  },
  {
    id: 'anvelope', name: 'Anvelope', icon: 'refresh', family: 'model_eprel', badge: 'EPREL azi · DPP ~2029',
    obligations: [
      { title: 'Eticheta anvelopei cu QR către EPREL', status: 'in_force', date: '2021-05-01', law: 'Reg. (UE) 2020/740', url: ELI('reg', 2020, 740), detail: 'Eticheta conține un cod QR care duce la fișa din EPREL.' },
      { title: 'Pașaport digital anvelope', status: 'indicative', dateLabel: '~2029', law: 'ESPR (UE) 2024/1781 — plan de lucru', url: DPP_PAGE, detail: 'Act delegat așteptat ~2027.' },
    ],
    documents: ['Date pentru eticheta UE', 'Omologare', 'Fișa EPREL'],
  },
  {
    id: 'ambalaje', name: 'Ambalaje', icon: 'doc', family: 'general', badge: '2027–2028',
    obligations: [
      { title: 'Regulamentul ambalajelor (PPWR)', status: 'in_force', date: '2026-08-12', law: 'Reg. (UE) 2025/40', url: ELI('reg', 2025, 40), detail: 'Cerințe generale pentru ambalaje.' },
      { title: 'Marcaj legat de schema EPR', status: 'adopted', date: '2027-02-12', law: 'Reg. (UE) 2025/40', url: ELI('reg', 2025, 40), detail: 'Identificator pe ambalaj pentru schema de răspundere extinsă.', verify: true },
      { title: 'Etichetă armonizată de sortare', status: 'adopted', date: '2028-08-12', law: 'Reg. (UE) 2025/40', url: ELI('reg', 2025, 40), detail: 'Sau la 24 de luni după actul de punere în aplicare.', verify: true },
    ],
    documents: ['Materialul ambalajului', 'Greutatea pe material', 'Conținut reciclat'],
  },
  {
    id: 'masini', name: 'Mașini și unelte', icon: 'settings', family: 'doc', badge: 'Instrucțiuni digitale 2027',
    obligations: [
      GPSR,
      { title: 'Instrucțiuni digitale și declarație de conformitate', status: 'adopted', date: '2027-01-20', law: 'Reg. (UE) 2023/1230', url: ELI('reg', 2023, 1230), detail: 'Instrucțiunile pot fi digitale, disponibile min. 10 ani; pe hârtie la cerere.' },
    ],
    documents: ['Declarația UE de conformitate', 'Evaluarea riscurilor', 'Instrucțiuni în română'],
  },
  {
    id: 'otel', name: 'Oțel și aluminiu', icon: 'chart', family: 'item', badge: 'DPP ~2028',
    obligations: [{ title: 'Pașaport digital oțel / aluminiu', status: 'indicative', dateLabel: '~2028', law: 'ESPR (UE) 2024/1781', url: DPP_PAGE, detail: 'Actul pentru oțel e așteptat la final de 2026; aluminiu ~2027–28.' }],
    documents: ['Certificat de material (3.1)', 'Amprenta de carbon', 'Conținut reciclat'],
  },
];

export const ROLE_NOTE: Record<Role, string> = {
  importer: 'Fabrica e în afara UE: voi răspundeți de pașaport și de înregistrarea lui înainte de punerea în liberă circulație.',
  distributor: 'Verificați că pașaportul există și că eticheta poartă codul; răspunderea principală e a importatorului.',
  brand: 'Produsul poartă marca voastră: sunteți considerați producător, cu toate obligațiile lui.',
  marketplace: 'Datele GPSR trebuie afișate în fiecare anunț online; marketplace-urile le cer deja.',
};

/** Timeline entries (shown on Home and on /termene). `firm` = adopted law; otherwise indicative. */
export const TIMELINE: { date: string; label: string; cat: string; firm: boolean }[] = [
  { date: '2024-12-13', label: 'Siguranța produselor (GPSR)', cat: 'gpsr', firm: true },
  { date: '2025-06-20', label: 'Telefoane și tablete: EPREL', cat: 'electronice', firm: true },
  { date: '2026-07-20', label: 'Registrul UE al pașapoartelor activ', cat: 'gpsr', firm: true },
  { date: '2027-01-20', label: 'Mașini: instrucțiuni digitale', cat: 'masini', firm: true },
  { date: '2027-02-12', label: 'Ambalaje: marcaj EPR', cat: 'ambalaje', firm: true },
  { date: '2027-02-18', label: 'Baterii: pașaport + QR', cat: 'baterii', firm: true },
  { date: '2028-04-17', label: 'Textile: scheme EPR', cat: 'textile', firm: true },
  { date: '2028-06-01', label: 'Oțel: pașaport (indicativ)', cat: 'otel', firm: false },
  { date: '2028-08-12', label: 'Ambalaje: etichetă armonizată', cat: 'ambalaje', firm: true },
  { date: '2028-10-01', label: 'Construcții: pașaport (indicativ)', cat: 'constructii', firm: false },
  { date: '2029-03-01', label: 'Textile și anvelope: pașaport (indicativ)', cat: 'textile', firm: false },
  { date: '2029-06-01', label: 'Electronice: pașaport (indicativ)', cat: 'electronice', firm: false },
  { date: '2029-09-23', label: 'Detergenți: pașaport', cat: 'detergenti', firm: true },
  { date: '2030-03-01', label: 'Mobilier: pașaport (indicativ)', cat: 'mobilier', firm: false },
  { date: '2030-08-01', label: 'Jucării: pașaport', cat: 'jucarii', firm: true },
];

export const CATALOG_UPDATED = '2026-11-25';
