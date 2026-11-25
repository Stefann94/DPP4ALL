// Three-layer validation: 1) required present, 2) well-formed values, 3) cross-field consistency.
// Errors block publishing; advisories never do.
import { FIELDS, FIELD, applies, modelFields, requirementOf, sectionsFor, unitFields, type FieldDef } from '../data/catalog';
import { checkGtin, SERIAL_RE } from './gs1';
import type { Passport, PassportData, Unit } from '../types';

export interface Issue {
  field: string;          // field name ('' for passport-level)
  section: string;        // section id
  level: 'error' | 'advisory' | 'later';
  code: string;
  message: string;
}

const EU = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']);
export const filled = (v: unknown) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
const get = (d: PassportData, f: FieldDef) => d?.[f.section]?.[f.name];
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Layer 2 for a single value. Returns an error message or null. */
export function formatError(f: FieldDef, v: unknown): string | null {
  if (!filled(v)) return null;
  switch (f.type) {
    case 'number': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return 'Introdu un număr.';
      if (f.min !== undefined && v < f.min) return `Minim ${f.min}.`;
      if (f.max !== undefined && v > f.max) return `Maxim ${f.max}.`;
      return null;
    }
    case 'url': return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(String(v)) ? null : 'Link complet, care începe cu https://';
    case 'month': return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v)) ? null : 'Format AAAA-LL.';
    case 'date': { const s = String(v); const d = new Date(s); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s) ? null : 'Dată invalidă.'; }
    case 'select': {
      const opts = f.options ?? (f.options_by_profile ? [...f.options_by_profile.battery_full, ...f.options_by_profile.battery_basic] : []);
      return opts.some(o => o.value === v) ? null : 'Alege o opțiune din listă.';
    }
    case 'multiselect': return Array.isArray(v) && v.every(x => (f.options ?? []).some(o => o.value === x)) ? null : 'Opțiune necunoscută.';
    case 'array': return Array.isArray(v) ? null : 'Listă invalidă.';
    case 'pictogram': return typeof v === 'boolean' ? null : 'Da sau nu.';
  }
  if (f.name === 'gtin') { const c = checkGtin(v); return c && !c.ok ? c.message + (c.suggestion ? ` Poate ai vrut ${c.suggestion}?` : '') : null; }
  if (/_country$/.test(f.name)) return /^[A-Z]{2}$/.test(String(v)) ? null : 'Cod de țară din 2 litere, ex. RO.';
  if (f.name === 'eori_number') return /^[A-Z]{2}[A-Z0-9]{1,15}$/.test(String(v)) ? null : 'EORI: 2 litere de țară + 1–15 caractere, majuscule.';
  if (f.name === 'manufacturer_email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : 'Adresă de e-mail invalidă.';
  if (f.name === 'serial_number') return SERIAL_RE.test(String(v)) ? null : 'Maxim 20 de caractere: litere, cifre și ! " % & \' ( ) * + , - . / : ; < = > ? _';
  return null;
}

/** Fields the designed-use answer exempts (industrial batteries). */
function exemptByDesignedUse(name: string, d: PassportData, category?: string | null): boolean {
  const use = d?.identificare?.battery_designed_use;
  if (!category || !['industrial_stationary', 'industrial_other'].includes(category)) return false;
  const backup = ['expected_lifetime_number_of_charge_discharge_cycles', 'cycle_life_reference_test', 'c_rate_of_relevant_cycle_life_test', 'initial_round_trip_energy_efficiency', 'round_trip_energy_efficiency_at_50_of_cycle_life'];
  const nonRech = [...backup, 'capacity_fade', 'power_fade', 'internal_resistance_increase', 'expected_lifetime_in_calendar_years'];
  if (use === 'backup_only') return backup.includes(name);
  if (use === 'not_rechargeable' && category === 'industrial_other') return nonRech.includes(name);
  return false;
}

export function validatePassport(p: Pick<Passport, 'category' | 'data'>, units: Unit[] = []): Issue[] {
  const out: Issue[] = [];
  const d = p.data ?? {};
  const c = p.category;
  if (!c) out.push({ field: 'battery_category', section: 'identificare', level: 'error', code: 'required', message: 'Alege categoria bateriei.' });
  // layers 1 + 2
  for (const s of sectionsFor(c)) {
    for (const f of modelFields(s.id, c)) {
      const v = get(d, f);
      const req = requirementOf(f, c);
      if (!filled(v)) {
        if (exemptByDesignedUse(f.name, d, c)) continue;
        if (req === 'required') out.push({ field: f.name, section: f.section, level: 'error', code: 'required', message: 'Câmp obligatoriu.' });
        else if (req === 'later') out.push({ field: f.name, section: f.section, level: 'later', code: 'required_from', message: `Obligatoriu din ${f.required_from!.split('-').reverse().join('.')}.` });
        continue;
      }
      const e = formatError(f, v);
      if (e) out.push({ field: f.name, section: f.section, level: 'error', code: 'format', message: e });
    }
  }
  // layer 3 — consistency
  const P = d.performanta ?? {}, I = d.identificare ?? {}, O = d.operator ?? {}, CF = d.amprenta_carbon ?? {}, CI = d.circularitate ?? {};
  const vmin = num(P.minimum_voltage), vnom = num(P.nominal_voltage), vmax = num(P.maximum_voltage);
  if (vmin !== null && vmax !== null && vmin >= vmax) out.push({ field: 'maximum_voltage', section: 'performanta', level: 'error', code: 'voltage_order', message: 'Tensiunea maximă trebuie să fie peste cea minimă.' });
  if (vnom !== null && ((vmin !== null && vnom < vmin) || (vmax !== null && vnom > vmax))) out.push({ field: 'nominal_voltage', section: 'performanta', level: 'error', code: 'voltage_range', message: 'Tensiunea nominală trebuie să fie între minimă și maximă.' });
  const tl = num(P.temperature_range_idle_state_lower_boundary), tu = num(P.temperature_range_idle_state_upper_boundary);
  if (tl !== null && tu !== null && tl >= tu) out.push({ field: 'temperature_range_idle_state_upper_boundary', section: 'performanta', level: 'error', code: 'temp_order', message: 'Limita superioară trebuie să fie peste cea inferioară.' });
  const r0 = num(P.initial_round_trip_energy_efficiency), r50 = num(P.round_trip_energy_efficiency_at_50_of_cycle_life);
  if (r0 !== null && r50 !== null && r50 > r0) out.push({ field: 'round_trip_energy_efficiency_at_50_of_cycle_life', section: 'performanta', level: 'advisory', code: 'efficiency_increase', message: 'Eficiența la 50% din viață e de obicei sub cea inițială.' });
  const total = num(CF.carbon_footprint_per_kwh);
  const stages = ['cf_raw_material_stage', 'cf_production_stage', 'cf_distribution_stage', 'cf_end_of_life_stage'].map(k => num(CF[k]));
  if (total !== null && stages.every(x => x !== null)) {
    const sum = stages.reduce((a, b) => a! + b!, 0)!;
    if (Math.abs(sum - total) > Math.max(0.5, total * 0.02)) out.push({ field: 'carbon_footprint_per_kwh', section: 'amprenta_carbon', level: 'error', code: 'cf_sum', message: `Etapele însumează ${sum.toFixed(1)}, dar totalul e ${total}.` });
  }
  if (total !== null && !filled(CF.carbon_footprint_basis)) out.push({ field: 'carbon_footprint_basis', section: 'amprenta_carbon', level: 'advisory', code: 'cf_basis', message: 'Precizează metodologia de calcul a amprentei.' });
  const mc = String(I.manufacturing_country ?? O.manufacturer_country ?? '');
  if (mc && !EU.has(mc) && !filled(O.eu_responsible_person) && !filled(O.eu_importer)) out.push({ field: 'eu_responsible_person', section: 'operator', level: 'advisory', code: 'non_eu_operator', message: 'Produs fabricat în afara UE: numește persoana responsabilă în UE sau importatorul.' });
  if (O.placed_on_market_by === 'importer' && !filled(O.eu_importer)) out.push({ field: 'eu_importer', section: 'operator', level: 'error', code: 'importer_missing', message: 'Ai ales că un importator introduce bateria pe piață: completează importatorul.' });
  for (const k of ['pre_consumer_recycled', 'post_consumer_recycled'] as const) for (const m of ['nickel', 'cobalt', 'lithium']) {
    const v = num(CI[`${k}_${m}_share`]); if (v !== null && (v < 0 || v > 100)) out.push({ field: `${k}_${m}_share`, section: 'circularitate', level: 'error', code: 'pct', message: 'Între 0 și 100%.' });
  }
  for (const m of ['nickel', 'cobalt', 'lithium']) {
    const a = num(CI[`pre_consumer_recycled_${m}_share`]) ?? 0, b = num(CI[`post_consumer_recycled_${m}_share`]) ?? 0;
    if (a + b > 100) out.push({ field: `post_consumer_recycled_${m}_share`, section: 'circularitate', level: 'error', code: 'pct_sum', message: 'Pre-consum + post-consum depășesc 100%.' });
  }
  const E = d.etichete_conformitate ?? {};
  if (E.cadmium_lead_symbol && (E.cadmium_symbol || E.lead_symbol)) out.push({ field: 'cadmium_lead_symbol', section: 'etichete_conformitate', level: 'advisory', code: 'symbols_overlap', message: 'Ai bifat și simbolul combinat Cd+Pb, și simbolurile separate.' });
  // units
  const seen = new Set<string>();
  for (const u of units) {
    if (seen.has(u.serial)) out.push({ field: 'serial_number', section: 'unitate', level: 'error', code: 'serial_duplicate', message: `Seria ${u.serial} apare de mai multe ori.` });
    seen.add(u.serial);
  }
  return out;
}

export function completeness(p: Pick<Passport, 'category' | 'data'>, includeLater = true) {
  const c = p.category;
  let total = 1, done = c ? 1 : 0;
  const issues = validatePassport(p);
  const bad = new Set(issues.filter(i => i.level === 'error').map(i => i.field));
  for (const s of sectionsFor(c)) for (const f of modelFields(s.id, c)) {
    const r = requirementOf(f, c);
    if (r === 'required' || (includeLater && r === 'later')) {
      if (exemptByDesignedUse(f.name, p.data ?? {}, c)) continue;
      total++;
      if (filled(get(p.data ?? {}, f)) && !bad.has(f.name)) done++;
    }
  }
  const errors = issues.filter(i => i.level === 'error');
  return { done, total, pct: Math.round((done / total) * 100), errors, advisories: issues.filter(i => i.level === 'advisory'), later: issues.filter(i => i.level === 'later'), canPublish: errors.length === 0 };
}

/** Required unit fields still missing for a unit (only reported once their date has passed or for 'later' info). */
export function unitMissing(category: string | null, u: Unit): { field: FieldDef; later: boolean }[] {
  return unitFields(category).filter(f => f.name !== 'serial_number' && ['required', 'later'].includes(requirementOf(f, category)) && !filled(u.values?.[f.name]) && !(f.name === 'status' && u.status) && !(f.name === 'batch_number' && u.batch) && !(f.name === 'unit_manufacturing_date' && u.manufacturingDate))
    .map(f => ({ field: f, later: requirementOf(f, category) === 'later' }));
}

/** Allowed unit status transitions (Annex XIII(4)(c)). Waste is terminal; nothing returns to original. */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return false;
  if (from === 'waste') return false;
  if (to === 'original') return false;
  return true;
}

export { FIELDS, FIELD, applies };
