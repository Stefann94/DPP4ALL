// Typed access to the field catalogue (src/data/fields.json, generated from the template in ../dpp-template).
import raw from './fields.json';
import type { AccessTier, BatteryCategory, Profile } from '../types';

export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'url' | 'array' | 'month' | 'date' | 'pictogram';
export interface Option { value: string; label: string }
export interface FieldDef {
  name: string;
  section: string;
  type: FieldType;
  item_type?: string;
  label: string;
  label_ro: string;
  description?: string;
  hint?: string;
  placeholder?: string;
  requirement: 'required' | 'recommended' | 'optional';
  requirement_basic?: 'required' | 'recommended' | 'optional';
  required_from?: string;
  required_when?: { field: string; one_of: string[] };
  access_tier: AccessTier;
  withheld_from_public?: boolean;
  unit?: string;
  unit_field?: string;
  min?: number;
  max?: number;
  options?: Option[];
  options_by_profile?: Record<Profile, Option[]>;
  per_battery?: boolean | 'override_allowed';
  regulation?: string[];
  profiles: Profile[];
}
export interface SectionDef { id: string; label_ro: string; regulation: string }

const CAT = raw as unknown as {
  template_version: string;
  sections: SectionDef[];
  fields: FieldDef[];
  category_rules: { rule: string; kinds: { value: BatteryCategory; category: string; condition: string }[] };
};

export const TEMPLATE_VERSION = CAT.template_version;
export const FIELDS: FieldDef[] = CAT.fields;
export const FIELD: Record<string, FieldDef> = Object.fromEntries(FIELDS.map(f => [f.name, f]));
/** Model sections in display order (excludes the per-battery "unitate" section). */
export const SECTIONS: SectionDef[] = CAT.sections.filter(s => s.id !== 'unitate');
export const UNIT_SECTION: SectionDef = CAT.sections.find(s => s.id === 'unitate')!;
export const CATEGORY_RULES = CAT.category_rules;

/** Short Romanian section titles for the UI. */
export const SECTION_SHORT: Record<string, string> = {
  identificare: 'Produs', operator: 'Producător', etichete_conformitate: 'Etichete și conformitate',
  amprenta_carbon: 'Amprentă de carbon', due_diligence: 'Due diligence', materiale: 'Materiale',
  circularitate: 'Circularitate', performanta: 'Performanță', unitate: 'Baterii individuale',
};

export const CATEGORIES: { value: BatteryCategory; label: string; short: string; profile: Profile }[] = [
  { value: 'industrial_stationary', label: 'Stocare staționară > 2 kWh', short: 'Staționară', profile: 'battery_full' },
  { value: 'industrial_other', label: 'Industrială > 2 kWh', short: 'Industrială', profile: 'battery_full' },
  { value: 'ev', label: 'Vehicul electric (EV)', short: 'EV', profile: 'battery_full' },
  { value: 'lmt', label: 'Transport ușor (LMT)', short: 'LMT', profile: 'battery_full' },
  { value: 'portable', label: 'Portabilă', short: 'Portabilă', profile: 'battery_basic' },
  { value: 'sli', label: 'Pornire auto (SLI)', short: 'SLI', profile: 'battery_basic' },
  { value: 'industrial_up_to_2kwh', label: 'Industrială ≤ 2 kWh', short: 'Ind. ≤ 2 kWh', profile: 'battery_basic' },
];
export const categoryLabel = (c?: string | null) => CATEGORIES.find(x => x.value === c)?.label ?? 'Fără categorie';
export const profileOf = (c?: string | null): Profile => CATEGORIES.find(x => x.value === c)?.profile ?? 'battery_full';

export const TIER_LABEL: Record<AccessTier, string> = { public: 'Public', restricted: 'Interes legitim', authority: 'Autorități' };
export const TIER_RANK: Record<AccessTier, number> = { public: 0, restricted: 1, authority: 2 };

/** Fields rendered inline as the unit selector of another number field (e.g. battery_mass_unit). */
export const UNIT_COMPANIONS = new Set(
  FIELDS.filter(f => f.unit_field && FIELD[f.unit_field]?.section === f.section).map(f => f.unit_field!),
);

const today = () => new Date().toISOString().slice(0, 10);

/** Does this field apply to a passport of this category? */
export function applies(f: FieldDef, category?: string | null): boolean {
  if (!f.profiles.includes(profileOf(category))) return false;
  if (f.required_when && category) return f.required_when.one_of.includes(category);
  return true;
}

export type Requirement = 'required' | 'later' | 'recommended' | 'optional';
/** Effective requirement today: 'later' = required from a future date (e.g. 18.02.2027). */
export function requirementOf(f: FieldDef, category?: string | null, onDate = today()): Requirement {
  const r = profileOf(category) === 'battery_basic' && f.requirement_basic ? f.requirement_basic : f.requirement;
  if (r === 'required' && f.required_from && f.required_from > onDate) return 'later';
  return r;
}
export const isMandatory = (f: FieldDef, c?: string | null) => ['required', 'later'].includes(requirementOf(f, c));

export function modelFields(sectionId: string, category?: string | null, opts: { includeOptional?: boolean } = {}): FieldDef[] {
  return FIELDS.filter(f =>
    f.section === sectionId && f.name !== 'battery_category' && !UNIT_COMPANIONS.has(f.name) &&
    applies(f, category) && (opts.includeOptional !== false || isMandatory(f, category)));
}
export function unitFields(category?: string | null, opts: { includeOptional?: boolean } = {}): FieldDef[] {
  return FIELDS.filter(f => f.section === 'unitate' && applies(f, category) && (opts.includeOptional !== false || isMandatory(f, category)));
}
/** Model sections that have at least one applicable field for this category. */
export function sectionsFor(category?: string | null): SectionDef[] {
  return SECTIONS.filter(s => modelFields(s.id, category).length > 0);
}

export function optionLabel(f: FieldDef, v: unknown): string {
  if (f.name === 'battery_category') return categoryLabel(String(v));
  const opts = f.options ?? (f.options_by_profile ? [...f.options_by_profile.battery_full, ...f.options_by_profile.battery_basic] : []);
  return opts.find(o => o.value === v)?.label ?? String(v);
}

export const UNIT_RO: Record<string, string> = { years: 'ani', months: 'luni' };

/** Unit of a number field, resolving companion unit selectors from the passport data. */
export function unitOf(f: FieldDef, data?: Record<string, Record<string, unknown>>): string | undefined {
  if (f.unit_field && FIELD[f.unit_field]) {
    const uf = FIELD[f.unit_field];
    const v = data?.[uf.section]?.[uf.name];
    if (typeof v === 'string' && v) return v;
  }
  return f.unit;
}

/** Key deadlines shown in dashboard, notifications and the deadlines page. */
export const DEADLINES = [
  { date: '2027-02-18', title: 'Pașaportul bateriei devine obligatoriu', detail: 'EV, LMT și industriale > 2 kWh introduse pe piață de la această dată (Art. 77(1)). Tot de atunci, toate bateriile poartă cod QR (Art. 13(6)).' },
  { date: '2027-08-18', title: 'Due diligence pe lanțul de aprovizionare', detail: 'Obligațiile din Art. 47–52 se aplică (amânate prin Reg. (UE) 2025/1561). Excepție: cifră de afaceri sub 40 mil. EUR.' },
  { date: '2028-02-18', title: 'Declarația amprentei de carbon (EV)', detail: 'Se aplică după actul delegat privind metodologia (Art. 7). Datele colectate acum devin publice atunci.' },
  { date: '2031-08-18', title: 'Conținut reciclat — documentare', detail: 'Ponderi minime de cobalt, plumb, litiu și nichel recuperate (Art. 8), după actul delegat de calcul.' },
];
