// Demo data (all invented). Loaded on first run and from Setări → Date demo.
import example from '../data/example.json';
import type { DB, Passport, PassportData, Unit, Reading, ScanEvent, AuditEvent, UnitStatus } from '../types';

let s = 42;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
const daysAgo = (n: number, h = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, Math.floor(rnd() * 60), 0, 0); return d.toISOString(); };
const ME = 'Andrei Popescu';

function sectionsOf(ex: Record<string, unknown>): PassportData {
  const out: PassportData = {};
  for (const [k, v] of Object.entries(ex)) if (!['meta', 'documente', 'unitati'].includes(k) && v && typeof v === 'object' && !Array.isArray(v)) out[k] = { ...(v as Record<string, unknown>) };
  return out;
}

export function seed(): DB {
  s = 42;
  const ex = example as unknown as Record<string, unknown>;
  const homeData = sectionsOf(ex);
  (homeData.identificare as Record<string, unknown>).product_name = 'Voltaria HomeCell 10';
  (homeData.identificare as Record<string, unknown>).manufacturing_date = '2026-09';
  const manufacturer = { ...(homeData.operator as Record<string, string>) };

  const p = (o: Partial<Passport> & Pick<Passport, 'id' | 'name' | 'category' | 'data'>): Passport => ({
    profile: ['portable', 'sli', 'industrial_up_to_2kwh'].includes(String(o.category)) ? 'battery_basic' : 'battery_full',
    status: 'draft', version: 1, publishedVersion: null, gtin: (o.data.identificare?.gtin as string) ?? null,
    modelStartingValues: true, createdAt: daysAgo(60), updatedAt: daysAgo(2), publishedAt: null, trashedAt: null,
    createdBy: ME, updatedBy: ME, ...o,
  });

  const passports: Passport[] = [
    p({ id: 'pp_homecell10', name: 'Voltaria HomeCell 10', category: 'industrial_stationary', data: homeData, status: 'published', version: 7, publishedVersion: 7, publishedAt: daysAgo(5), createdAt: daysAgo(54), updatedAt: daysAgo(5) }),
    p({ id: 'pp_homecell5', name: 'Voltaria HomeCell 5', category: 'industrial_stationary', status: 'published', version: 4, publishedVersion: 4, publishedAt: daysAgo(12), createdAt: daysAgo(40),
      data: { ...structuredClone(homeData), identificare: { ...(homeData.identificare as object), product_name: 'Voltaria HomeCell 5', gtin: '5949876543226', battery_model_identifier: 'VLT-HC5-LFP-51V100', battery_mass: 52 }, performanta: { ...(homeData.performanta as object), rated_capacity: 100, original_power_capability: 5120, maximum_permitted_battery_power: 5120 } } }),
    p({ id: 'pp_ebike', name: 'Voltaria Ride 48V 14Ah', category: 'lmt', createdAt: daysAgo(9), updatedAt: daysAgo(1),
      data: { identificare: { product_name: 'Voltaria Ride 48V 14Ah', gtin: '5949876543233', battery_model_identifier: 'VLT-RIDE-48-14', manufacturing_place: 'Cluj-Napoca, România', battery_mass: 3.6, battery_mass_unit: 'kg' }, operator: { ...manufacturer }, materiale: { battery_chemistry: 'Litiu-ion NMC 811', battery_chemistry_codes: ['lithiumIonNMC'] }, performanta: { rated_capacity: 14, rated_capacity_unit: 'Ah', nominal_voltage: 48, minimum_voltage: 39, maximum_voltage: 54.6 } } }),
    p({ id: 'pp_rack', name: 'Voltaria Rack 15 HV', category: 'industrial_stationary', createdAt: daysAgo(3), updatedAt: daysAgo(0),
      data: { identificare: { product_name: 'Voltaria Rack 15 HV', battery_model_identifier: 'VLT-RACK15-HV' }, operator: { ...manufacturer } } }),
    p({ id: 'pp_aa', name: 'Voltaria PowerCell AA 2500', category: 'portable', status: 'published', version: 2, publishedVersion: 2, publishedAt: daysAgo(20),
      data: { identificare: { product_name: 'Voltaria PowerCell AA 2500', gtin: '5949876543240', battery_model_identifier: 'VLT-AA-2500', battery_mass: 27, battery_mass_unit: 'g', rated_capacity: 2500, rated_capacity_unit: 'mAh' }, operator: { ...manufacturer },
        etichete_conformitate: { eu_declaration_of_conformity_url: 'https://dpp.voltaria.example/docs/doc-ue-aa.pdf', meaning_of_labels_and_symbols: 'Pubela tăiată: colectare separată.', separate_collection_symbol: true },
        circularitate: { end_user_waste_prevention_url: 'https://voltaria.example/ghid', end_user_separate_collection_url: 'https://voltaria.example/colectare', collection_and_second_life_url: 'https://voltaria.example/retur', waste_battery_safety_instructions: 'Izolați bornele înainte de predare.' },
        materiale: { impact_of_substances: 'Nu conține mercur, cadmiu sau plumb peste praguri.' } } }),
    p({ id: 'pp_old', name: 'Voltaria HomeCell 8 (retras)', category: 'industrial_stationary', status: 'trashed', trashedAt: daysAgo(15), data: { identificare: { product_name: 'Voltaria HomeCell 8 (retras)' } } }),
  ];

  // units + readings for HomeCell 10
  const units: Unit[] = [];
  const readings: Reading[] = [];
  const statuses: UnitStatus[] = ['original', 'original', 'original', 'original', 'original', 'original', 'repurposed', 'original', 'remanufactured', 'waste'];
  for (let i = 1; i <= 36; i++) {
    const serial = `HC10-2609-${String(180 + i).padStart(6, '0')}`;
    const status: UnitStatus = i <= 10 ? statuses[i - 1]! : 'original';
    const cycles = Math.round(80 + rnd() * 1800);
    const cap = +(200 - cycles * 0.012 - rnd() * 2).toFixed(1);
    const id = `un_${i}`;
    units.push({ id, passportId: 'pp_homecell10', serial, batch: i <= 18 ? 'L2609-04' : 'L2610-01', manufacturingDate: i <= 18 ? '2026-09' : '2026-10', status,
      values: { status, remaining_capacity: cap, charge_discharge_cycles: cycles, self_discharge_rate: +(2.2 + rnd()).toFixed(1), state_of_charge: Math.round(20 + rnd() * 75), temperature: Math.round(18 + rnd() * 18) },
      createdAt: daysAgo(50 - (i % 10)), updatedAt: daysAgo(i % 7) });
    readings.push({ id: `rd_${i}_a`, unitId: id, passportId: 'pp_homecell10', field: 'remaining_capacity', value: 199.6, observedOn: daysAgo(50).slice(0, 10), source: 'measurement', note: 'Test final de linie', recordedBy: 'QA Linie 2', recordedAt: daysAgo(50) });
    readings.push({ id: `rd_${i}_b`, unitId: id, passportId: 'pp_homecell10', field: 'remaining_capacity', value: cap, observedOn: daysAgo(i % 7).slice(0, 10), source: 'bms', recordedBy: 'api:bms-sync', recordedAt: daysAgo(i % 7) });
    readings.push({ id: `rd_${i}_c`, unitId: id, passportId: 'pp_homecell10', field: 'charge_discharge_cycles', value: cycles, observedOn: daysAgo(i % 7).slice(0, 10), source: 'bms', recordedBy: 'api:bms-sync', recordedAt: daysAgo(i % 7) });
    if (status !== 'original') readings.push({ id: `rd_${i}_s`, unitId: id, passportId: 'pp_homecell10', field: 'status', value: status, observedOn: daysAgo(4).slice(0, 10), source: 'brand_statement', note: status === 'repurposed' ? 'Preluată de EnerReuse SRL pentru stocare comercială' : undefined, recordedBy: ME, recordedAt: daysAgo(4) });
  }
  units[2]!.values.negative_events = '2027-07-14: supratemperatură 68 °C, oprire automată BMS';
  units[4]!.values.remaining_capacity = 158.2;

  // scans over the last 90 days
  const countries = ['RO', 'RO', 'RO', 'DE', 'DE', 'IT', 'PL', 'FR', 'AT', 'HU', 'NL', 'ES'];
  const scans: ScanEvent[] = [];
  const pubIds = ['pp_homecell10', 'pp_homecell10', 'pp_homecell10', 'pp_homecell5', 'pp_aa', 'pp_aa'];
  for (let d = 0; d < 90; d++) {
    const n = Math.round(3 + rnd() * 9 + (90 - d) / 12);
    for (let k = 0; k < n; k++) {
      const pid = pick(pubIds);
      scans.push({ id: `sc_${d}_${k}`, passportId: pid, unitSerial: pid === 'pp_homecell10' && rnd() > 0.4 ? units[Math.floor(rnd() * units.length)]!.serial : undefined, at: daysAgo(d, 7 + Math.floor(rnd() * 14)), country: pick(countries), device: rnd() > 0.15 ? 'mobile' : rnd() > 0.5 ? 'desktop' : 'scanner', language: pick(['ro', 'ro', 'en', 'de', 'it']) });
    }
  }

  const audit: AuditEvent[] = [
    { id: 'ae1', type: 'passport.published', actor: ME, summary: 'A publicat Voltaria HomeCell 10 (v7)', passportId: 'pp_homecell10', at: daysAgo(5) },
    { id: 'ae2', type: 'unit.status_changed', actor: ME, summary: 'HC10-2609-000187 → Repurposed', passportId: 'pp_homecell10', at: daysAgo(4) },
    { id: 'ae3', type: 'access.requested', actor: 'GreenCycle Recycling SRL', summary: 'Cerere acces interes legitim (reciclator)', at: daysAgo(1) },
    { id: 'ae4', type: 'import.completed', actor: 'Maria Ionescu', summary: 'Import: 24 de baterii din serii_lot_L2704.xlsx', passportId: 'pp_homecell10', at: daysAgo(6) },
    { id: 'ae5', type: 'passport.updated', actor: 'Maria Ionescu', summary: 'A modificat Voltaria Ride 48V 14Ah', passportId: 'pp_ebike', at: daysAgo(1) },
    { id: 'ae6', type: 'passport.created', actor: ME, summary: 'A creat Voltaria Rack 15 HV', passportId: 'pp_rack', at: daysAgo(0, 9) },
  ];

  return {
    org: {
      name: 'Voltaria Energy SRL', slug: 'voltaria', plan: 'pro', trialEndsAt: null,
      manufacturer, brand: { primary: '#1f4fc4', accent: '#0f7a5f', showPoweredBy: false },
      languages: ['ro', 'en', 'de'], defaultLanguage: 'ro', resolver: 'https://dpp.voltaria.example',
      customDomain: { host: 'dpp.voltaria.example', status: 'live', cname: 'resolver.dpp-platform.example', txt: '_dpp-verify.dpp.voltaria.example', checkedAt: daysAgo(1) },
      gln: '5949876500004',
      notifications: { deadlines: true, alerts: true, accessRequests: true, weeklyDigest: false, email: 'conformitate@voltaria.example' },
    },
    session: { userId: 'mb_1', name: ME, email: 'andrei@voltaria.example', role: 'owner' },
    passports,
    versions: [],
    units,
    readings,
    documents: [
      { id: 'doc_1', name: 'Declarație UE de conformitate HC10 v3.pdf', type: 'conformity_declaration', accessTier: 'public', mime: 'application/pdf', size: 284_000, passportIds: ['pp_homecell10'], uploadedAt: daysAgo(20), uploadedBy: ME },
      { id: 'doc_2', name: 'Raport IEC 62619 + 62620.pdf', type: 'test_report', accessTier: 'authority', mime: 'application/pdf', size: 3_400_000, passportIds: ['pp_homecell10', 'pp_homecell5'], uploadedAt: daysAgo(30), uploadedBy: 'Maria Ionescu' },
      { id: 'doc_3', name: 'Manual demontare HC.pdf', type: 'manual', accessTier: 'restricted', mime: 'application/pdf', size: 1_900_000, passportIds: ['pp_homecell10', 'pp_homecell5'], uploadedAt: daysAgo(25), uploadedBy: ME },
      { id: 'doc_4', name: 'Studiu amprentă carbon PEF 2027.pdf', type: 'carbon_footprint_study', accessTier: 'public', mime: 'application/pdf', size: 820_000, passportIds: ['pp_homecell10'], uploadedAt: daysAgo(18), uploadedBy: ME },
      { id: 'doc_5', name: 'Fișă tehnică celulă LF280K.pdf', type: 'datasheet', accessTier: 'restricted', mime: 'application/pdf', size: 640_000, passportIds: [], uploadedAt: daysAgo(10), uploadedBy: 'Maria Ionescu' },
    ],
    members: [
      { id: 'mb_1', name: ME, email: 'andrei@voltaria.example', role: 'owner', joinedAt: daysAgo(120), lastActiveAt: daysAgo(0) },
      { id: 'mb_2', name: 'Maria Ionescu', email: 'maria@voltaria.example', role: 'editor', joinedAt: daysAgo(90), lastActiveAt: daysAgo(1) },
      { id: 'mb_3', name: 'Radu Matei', email: 'radu@voltaria.example', role: 'admin', joinedAt: daysAgo(60), lastActiveAt: daysAgo(3) },
      { id: 'mb_4', name: 'Ioana Dumitru', email: 'ioana@voltaria.example', role: 'viewer', joinedAt: daysAgo(14) },
    ],
    invites: [{ id: 'iv_1', email: 'service@voltaria.example', role: 'editor', createdAt: daysAgo(2), expiresAt: daysAgo(-5), invitedBy: ME }],
    accessRequests: [
      { id: 'ar_1', organization: 'GreenCycle Recycling SRL', contactName: 'Mihai Stan', email: 'mihai@greencycle.example', kind: 'recycler', reason: 'Reciclare baterii LFP returnate prin schema EPR; avem nevoie de compoziție și manuale de demontare.', scope: 'all', passportIds: [], tierRequested: 'restricted', status: 'pending', createdAt: daysAgo(1) },
      { id: 'ar_2', organization: 'EnerReuse SRL', contactName: 'Elena Vasile', email: 'elena@enerreuse.example', kind: 'second_life', reason: 'Evaluare SoH pentru reutilizare în stocare comercială.', scope: 'passport', passportIds: ['pp_homecell10'], tierRequested: 'restricted', status: 'approved', createdAt: daysAgo(20), decidedAt: daysAgo(19), decidedBy: ME, expiresAt: daysAgo(-160), token: 'acc_7f3k29xq' },
      { id: 'ar_3', organization: 'ANPC — Supraveghere piață', contactName: 'Inspector C. Pop', email: 'control@anpc.example', kind: 'authority', reason: 'Verificare conformitate rapoarte de testare.', scope: 'passport', passportIds: ['pp_homecell10'], tierRequested: 'authority', status: 'approved', createdAt: daysAgo(8), decidedAt: daysAgo(8), decidedBy: 'Radu Matei', expiresAt: daysAgo(-22), token: 'acc_auth_91mz' },
      { id: 'ar_4', organization: 'QuickFix Service', contactName: 'Dan Ilie', email: 'dan@quickfix.example', kind: 'repairer', reason: 'Reparații', scope: 'all', passportIds: [], tierRequested: 'restricted', status: 'rejected', createdAt: daysAgo(30), decidedAt: daysAgo(29), decidedBy: ME },
    ],
    accessLog: [
      { id: 'al_1', requestId: 'ar_2', organization: 'EnerReuse SRL', passportId: 'pp_homecell10', unitSerial: 'HC10-2609-000187', fieldsViewed: 14, at: daysAgo(4) },
      { id: 'al_2', requestId: 'ar_2', organization: 'EnerReuse SRL', passportId: 'pp_homecell10', unitSerial: 'HC10-2609-000189', fieldsViewed: 14, at: daysAgo(3) },
      { id: 'al_3', requestId: 'ar_3', organization: 'ANPC — Supraveghere piață', passportId: 'pp_homecell10', fieldsViewed: 31, at: daysAgo(7) },
    ],
    apiKeys: [
      { id: 'key_1', name: 'ERP producție', mode: 'live', prefix: 'dpp_live_8f2a', scopes: ['passports:read', 'passports:write', 'units:write'], createdAt: daysAgo(40), lastUsedAt: daysAgo(0), createdBy: ME },
      { id: 'key_2', name: 'BMS sync', mode: 'live', prefix: 'dpp_live_c71e', scopes: ['units:read', 'units:write'], createdAt: daysAgo(35), lastUsedAt: daysAgo(0), createdBy: 'Radu Matei' },
      { id: 'key_3', name: 'Teste integrare', mode: 'test', prefix: 'dpp_test_04bd', scopes: ['passports:read', 'passports:write', 'units:read', 'units:write', 'documents:write', 'events:read'], createdAt: daysAgo(41), createdBy: ME },
    ],
    webhooks: [{ id: 'wh_1', url: 'https://erp.voltaria.example/hooks/dpp', events: ['passport.published', 'unit.status_changed', 'access.requested'], secret: 'whsec_3kq9b2m', active: true, createdAt: daysAgo(30) }],
    deliveries: [
      { id: 'dl_1', webhookId: 'wh_1', event: 'passport.published', status: 200, durationMs: 182, at: daysAgo(5), payload: { passport: 'pp_homecell10', version: 7 } },
      { id: 'dl_2', webhookId: 'wh_1', event: 'unit.status_changed', status: 200, durationMs: 140, at: daysAgo(4), payload: { serial: 'HC10-2609-000187', status: 'repurposed' } },
      { id: 'dl_3', webhookId: 'wh_1', event: 'access.requested', status: 500, durationMs: 3021, at: daysAgo(1), payload: { request: 'ar_1' } },
    ],
    alertRules: [
      { id: 'rule_1', name: 'Capacitate sub 80%', field: 'remaining_capacity', op: '<', threshold: 160, active: true },
      { id: 'rule_2', name: 'Temperatură peste 55 °C', field: 'temperature', op: '>', threshold: 55, active: true },
    ],
    alerts: [{ id: 'al_a1', ruleId: 'rule_1', passportId: 'pp_homecell10', unitId: 'un_5', message: 'HC10-2609-000185: capacitate rămasă 158,2 Ah (sub 160 Ah)', at: daysAgo(2), acknowledged: false }],
    scans,
    audit,
    notifications: [
      { id: 'nt_1', kind: 'access', title: 'Cerere nouă de acces', body: 'GreenCycle Recycling SRL cere acces la datele restricționate.', href: '/acces', at: daysAgo(1), read: false },
      { id: 'nt_2', kind: 'alert', title: 'Alertă BMS', body: 'HC10-2609-000185: capacitate sub prag.', href: '/telemetrie', at: daysAgo(2), read: false },
      { id: 'nt_3', kind: 'deadline', title: 'Mai sunt sub 90 de zile până la 18.02.2027', body: '2 pașapoarte nu sunt încă complete.', href: '/termene', at: daysAgo(3), read: true },
    ],
    imports: [{ id: 'im_1', fileName: 'serii_lot_L2704.xlsx', rows: 24, created: 24, updated: 0, skipped: 0, errors: 0, at: daysAgo(6), by: 'Maria Ionescu', target: 'units' }],
  };
}
