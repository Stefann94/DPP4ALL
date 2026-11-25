// Column definitions + value serialisation shared by templates, CSV/Excel export and the import round-trip.
import { FIELDS, SECTIONS, type FieldDef } from '../../data/catalog';
import type { Passport } from '../../types';

/** Model (passport-level) fields, in section order. Excludes the per-battery section. */
export const MODEL_FIELDS: FieldDef[] = SECTIONS.flatMap(s => FIELDS.filter(f => f.section === s.id));

/** Fields required in at least one profile (today or from a future date) + the identifying columns. */
export const REQUIRED_FIELDS: FieldDef[] = MODEL_FIELDS.filter(f =>
  f.requirement === 'required' || f.requirement_basic === 'required' || ['product_name', 'gtin', 'battery_category'].includes(f.name));

/** Columns that always lead a passport sheet. */
const LEAD = ['product_name', 'gtin', 'battery_category', 'battery_model_identifier'];
export function orderColumns(fields: FieldDef[]): FieldDef[] {
  const lead = LEAD.map(n => fields.find(f => f.name === n)).filter(Boolean) as FieldDef[];
  return [...lead, ...fields.filter(f => !LEAD.includes(f.name))];
}

/** Serialise a stored value so that the importer reads it back identically. */
export function serializeValue(f: FieldDef | undefined, v: unknown): string {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map(x => String(x)).join('; ');
  if (typeof v === 'boolean') return v ? 'da' : 'nu';
  if (typeof v === 'number') return String(v);
  if (f?.type === 'pictogram') return v ? 'da' : 'nu';
  return String(v);
}

export const getValue = (p: Passport, f: FieldDef) => p.data?.[f.section]?.[f.name];

/** Columns actually used by a set of passports (identifying columns always kept). */
export function usedColumns(list: Passport[], all = MODEL_FIELDS): FieldDef[] {
  const used = all.filter(f => LEAD.includes(f.name) || list.some(p => {
    const v = getValue(p, f); return !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));
  }));
  return orderColumns(used);
}

export function passportRows(list: Passport[], cols: FieldDef[]): string[][] {
  return list.map(p => cols.map(f => f.name === 'battery_category' ? (p.category ?? serializeValue(f, getValue(p, f))) : serializeValue(f, getValue(p, f))));
}

export const UNIT_COLUMNS = ['serial', 'batch', 'manufacturing_date', 'status'];
export const READING_COLUMNS = ['serial', 'field', 'value', 'observed_on', 'source', 'note'];

/** Filesystem-safe slug. */
export const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'fara-nume';
