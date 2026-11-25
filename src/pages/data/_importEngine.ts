// Pure import logic: file parsing, header detection, column auto-mapping, value coercion,
// row building with validation and duplicate detection, and applying the import.
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CATEGORIES, FIELD, FIELDS, optionLabel, type FieldDef } from '../../data/catalog';
import { filled, formatError, validatePassport } from '../../lib/validation';
import { toGtin14 } from '../../lib/gs1';
import { readAsArrayBuffer, readAsText } from '../../lib/download';
import { passports as passportActions } from '../../api/actions';
import { getDB } from '../../api/store';
import type { BatteryCategory, Passport, PassportData, UnitStatus } from '../../types';

// ───────────── parsing ─────────────
export type Sheet = { name: string; rows: string[][] };
export type Parsed = { kind: 'table'; sheets: Sheet[] } | { kind: 'json'; json: unknown };

export async function parseFile(file: File): Promise<Parsed> {
  const n = file.name.toLowerCase();
  if (n.endsWith('.json')) return { kind: 'json', json: JSON.parse((await readAsText(file)).replace(/^﻿/, '')) };
  if (/\.(xlsx|xlsm|xls|ods)$/.test(n)) {
    const wb = XLSX.read(await readAsArrayBuffer(file), { type: 'array', cellDates: true });
    return { kind: 'table', sheets: wb.SheetNames.map(name => ({ name, rows: sheetRows(wb.Sheets[name]!) })) };
  }
  return { kind: 'table', sheets: [{ name: file.name, rows: parseCsv(await readAsText(file)) }] };
}

export function parseCsv(text: string): string[][] {
  const r = Papa.parse<unknown[]>(text.replace(/^﻿/, ''), { skipEmptyLines: 'greedy' });
  return (r.data as unknown[][]).map(row => row.map(c => String(c ?? '').trim()));
}

function cellToString(v: unknown): string {
  if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (typeof v === 'boolean') return v ? 'da' : 'nu';
  return String(v ?? '').trim();
}
function sheetRows(ws: XLSX.WorkSheet): string[][] {
  const a = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
  return a.map(r => r.map(cellToString)).filter(r => r.some(c => c !== ''));
}

// ───────────── column matching ─────────────
/** Case/diacritics-insensitive key; camelCase → snake; trailing * removed. */
export const norm = (s: string) => String(s ?? '')
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/\*+$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const PASSPORT_FIELDS = FIELDS.filter(f => f.section !== 'unitate');
const ALIASES: Record<string, string> = {
  nume: 'product_name', denumire: 'product_name', produs: 'product_name', name: 'product_name', product: 'product_name',
  ean: 'gtin', ean13: 'gtin', ean_13: 'gtin', cod_bare: 'gtin', barcode: 'gtin',
  categorie: 'battery_category', category: 'battery_category', tip_baterie: 'battery_category',
  model: 'battery_model_identifier', cod_model: 'battery_model_identifier', model_id: 'battery_model_identifier',
  producator: 'manufacturer_name', manufacturer: 'manufacturer_name', chimie: 'battery_chemistry', chemistry: 'battery_chemistry',
  masa: 'battery_mass', greutate: 'battery_mass', capacitate: 'rated_capacity', capacity: 'rated_capacity',
};
const INDEX = new Map<string, string>();
for (const f of PASSPORT_FIELDS) for (const k of [f.name, f.label_ro, f.label, f.label_ro.replace(/\s*\(.*\)\s*/g, ' '), (f as FieldDef & { source_name?: string }).source_name]) {
  const key = k ? norm(k) : ''; if (key && !INDEX.has(key)) INDEX.set(key, f.name);
}
for (const [a, f] of Object.entries(ALIASES)) if (!INDEX.has(a)) INDEX.set(a, f);

export function matchField(header: string): string { return INDEX.get(norm(header)) ?? ''; }
export function autoMap(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map(h => { const m = matchField(h); if (!m || used.has(m)) return ''; used.add(m); return m; });
}

/** Finds the header row (best catalogue match in the first 10 rows) and whether a label row follows it. */
export function detectHeader(rows: string[][]): { header: number; skipLabelRow: boolean } {
  let best = 0, bestScore = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const s = autoMap(rows[i]!).filter(Boolean).length;
    if (s > bestScore) { best = i; bestScore = s; }
  }
  const map = autoMap(rows[best] ?? []);
  const next = rows[best + 1] ?? [];
  const mapped = map.map((f, c) => [f, c] as const).filter(([f]) => f);
  const labelHits = mapped.filter(([f, c]) => next[c] && norm(next[c]!) === norm(FIELD[f]!.label_ro)).length;
  return { header: best, skipLabelRow: mapped.length > 0 && labelHits >= mapped.length / 2 };
}

// ───────────── value coercion ─────────────
const TRUE = new Set(['da', 'yes', 'true', '1', 'x', 'y', 'adevarat', 'ja', 'oui', '✓']);
const FALSE = new Set(['nu', 'no', 'false', '0', 'n', 'fals', 'nein', 'non', '-']);
const MONTHS: Record<string, number> = { ian: 1, jan: 1, feb: 2, mar: 3, apr: 4, mai: 5, may: 5, iun: 6, jun: 6, iul: 7, jul: 7, aug: 8, sep: 9, oct: 10, noi: 11, nov: 11, dec: 12 };

export function parseNumber(raw: string): number | null {
  let s = raw.replace(/[\s ]/g, '').replace(/[^\d,.\-+eE]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseMonth(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/); if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{4})$/); if (m) return `${m[2]}-${m[1]!.padStart(2, '0')}`;
  m = s.match(/^\d{1,2}[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return `${m[2]}-${m[1]!.padStart(2, '0')}`;
  m = s.normalize('NFD').replace(/[̀-ͯ]/g, '').match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/); if (m && MONTHS[m[1]!]) return `${m[2]}-${String(MONTHS[m[1]!]).padStart(2, '0')}`;
  return null;
}
function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/); if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return null;
}

function matchOption(f: FieldDef, raw: string): string | null {
  const opts = f.name === 'battery_category'
    ? CATEGORIES.map(c => ({ value: c.value as string, labels: [c.label, c.short] }))
    : [...(f.options ?? []), ...(f.options_by_profile ? [...f.options_by_profile.battery_full, ...f.options_by_profile.battery_basic] : [])].map(o => ({ value: o.value, labels: [o.label] }));
  const n = norm(raw);
  for (const o of opts) if (o.value === raw || norm(o.value) === n || o.labels.some(l => norm(l) === n)) return o.value;
  if (f.name === 'battery_category') for (const o of opts) if (norm(optionLabel(f, o.value)) === n) return o.value;
  return null;
}

/** Converts a cell into the stored value for this field. */
export function coerce(f: FieldDef, raw: string): { value?: unknown; error?: string } {
  const s = String(raw ?? '').trim();
  if (!s) return {};
  switch (f.type) {
    case 'number': { const n = parseNumber(s); return n === null ? { error: `„${s}” nu e un număr` } : { value: n }; }
    case 'pictogram': { const k = norm(s) || s; if (TRUE.has(k) || s === '✓') return { value: true }; if (FALSE.has(k)) return { value: false }; return { error: `„${s}”: folosește da / nu` }; }
    case 'select': { const v = matchOption(f, s); return v ? { value: v } : { error: `„${s}” nu e o opțiune validă` }; }
    case 'multiselect': {
      const parts = s.split(/[;|]/).map(x => x.trim()).filter(Boolean);
      const vals: string[] = [];
      for (const p of parts) { const v = matchOption(f, p); if (!v) return { error: `„${p}” nu e o opțiune validă` }; vals.push(v); }
      return { value: [...new Set(vals)] };
    }
    case 'array': return { value: s.split(/[;|\n]/).map(x => x.trim()).filter(Boolean) };
    case 'month': { const m = parseMonth(s); return m ? { value: m } : { error: `„${s}”: lună invalidă (AAAA-LL)` }; }
    case 'date': { const d = parseDate(s); return d ? { value: d } : { error: `„${s}”: dată invalidă` }; }
    case 'url': return { value: s };
  }
  if (f.name === 'gtin') return { value: s.replace(/\s+/g, '') };
  if (/_country$/.test(f.name) || f.name === 'eori_number') return { value: s.toUpperCase() };
  return { value: s };
}

// ───────────── row building ─────────────
export type RowAction = 'create' | 'update' | 'skip';
export type KeyField = 'gtin' | 'battery_model_identifier';
export interface Candidate { name: string; category: BatteryCategory | null; data: PassportData; source: string[]; line: number; coerceErrors: { field: string; message: string }[] }
export interface ImportRow extends Candidate {
  errors: { field: string; message: string }[];   // block import of the row
  missing: string[];                               // required fields missing (labels) — row imports as draft
  advisories: string[];
  key: string | null;
  dupInFile: boolean;
  existing: Passport | null;
  action: RowAction;
}

export function candidatesFromTable(dataRows: string[][], mapping: string[], firstLine: number, defaultCategory: BatteryCategory | null): Candidate[] {
  return dataRows.map((row, i) => {
    const data: PassportData = {};
    const coerceErrors: { field: string; message: string }[] = [];
    mapping.forEach((name, c) => {
      if (!name) return;
      const f = FIELD[name]; if (!f) return;
      const r = coerce(f, row[c] ?? '');
      if (r.error) coerceErrors.push({ field: name, message: r.error });
      else if (r.value !== undefined) { data[f.section] ??= {}; data[f.section]![f.name] = r.value; }
    });
    let category = (data.identificare?.battery_category as BatteryCategory | undefined) ?? null;
    if (!category && defaultCategory) { category = defaultCategory; data.identificare = { ...(data.identificare ?? {}), battery_category: category }; }
    return { name: String(data.identificare?.product_name ?? '').trim(), category, data, source: row, line: firstLine + i, coerceErrors };
  });
}

/** Accepts the CLI/platform import JSON or a platform export JSON. */
export function candidatesFromJson(json: unknown): Candidate[] {
  const j = json as { format?: string; passports?: unknown[] } | unknown[];
  const list = Array.isArray(j) ? j : Array.isArray(j?.passports) ? j.passports : null;
  if (!list) throw new Error('JSON-ul nu conține o listă „passports”.');
  return list.map((x, i) => {
    const o = x as { name?: string; category?: string | null; data?: PassportData };
    const data: PassportData = structuredClone(o.data ?? {});
    const coerceErrors: { field: string; message: string }[] = [];
    const category = (o.category ?? (data.identificare?.battery_category as string) ?? null) as BatteryCategory | null;
    if (category && !CATEGORIES.some(c => c.value === category)) coerceErrors.push({ field: 'battery_category', message: `Categorie necunoscută: ${category}` });
    return { name: String(o.name ?? data.identificare?.product_name ?? '').trim(), category, data, source: [JSON.stringify(x)], line: i + 1, coerceErrors };
  });
}

export function keyOf(keyField: KeyField, data: PassportData | undefined, gtin?: string | null): string | null {
  if (keyField === 'gtin') { const g = String(gtin ?? data?.identificare?.gtin ?? '').trim(); return g ? (toGtin14(g) ?? g) : null; }
  const m = String(data?.identificare?.battery_model_identifier ?? '').trim().toLowerCase();
  return m || null;
}

export function buildRows(cands: Candidate[], opts: { keyField: KeyField; existingDefault: RowAction; allowErrors: boolean }): ImportRow[] {
  const existing = getDB().passports.filter(p => p.status !== 'trashed');
  const byKey = new Map<string, Passport>();
  for (const p of existing) { const k = keyOf(opts.keyField, p.data, p.gtin); if (k && !byKey.has(k)) byKey.set(k, p); }
  const seen = new Set<string>();
  return cands.map(c => {
    const errors = [...c.coerceErrors];
    if (!c.name) errors.push({ field: 'product_name', message: 'Lipsește denumirea produsului' });
    for (const sec of Object.values(c.data)) for (const [k, v] of Object.entries(sec ?? {})) {
      const f = FIELD[k]; if (!f || !filled(v)) continue;
      const e = formatError(f, v);
      if (e && !errors.some(x => x.field === k)) errors.push({ field: k, message: e });
    }
    const issues = validatePassport({ category: c.category, data: c.data });
    const missing: string[] = [];
    const advisories: string[] = [];
    for (const i of issues) {
      if (i.level === 'error' && i.code === 'required') missing.push(FIELD[i.field]?.label_ro ?? i.field);
      else if (i.level === 'error' && !errors.some(x => x.field === i.field)) errors.push({ field: i.field, message: i.message });
      else if (i.level === 'advisory') advisories.push(i.message);
    }
    const key = keyOf(opts.keyField, c.data);
    const dupInFile = !!key && seen.has(key);
    if (key) seen.add(key);
    const ex = key ? byKey.get(key) ?? null : null;
    let action: RowAction = ex ? opts.existingDefault : 'create';
    if (dupInFile) action = 'skip';
    if (errors.length && !opts.allowErrors) action = 'skip';
    return { ...c, errors, missing, advisories, key, dupInFile, existing: ex, action };
  });
}

export const fieldLabel = (name: string) => FIELD[name]?.label_ro ?? name;

/** Applies the rows. Invalid fields are dropped when importing rows that have errors. */
export function applyImport(rows: ImportRow[], opts: { fillManufacturer: boolean }) {
  const org = getDB().org;
  let created = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    if (r.action === 'skip' || !r.name) { skipped++; continue; }
    const bad = new Set(r.errors.map(e => e.field));
    const data: PassportData = {};
    for (const [s, sec] of Object.entries(r.data)) for (const [k, v] of Object.entries(sec ?? {})) if (!bad.has(k)) { data[s] ??= {}; data[s]![k] = v; }
    if (r.action === 'update' && r.existing) {
      const values = Object.entries(data).flatMap(([section, sec]) => Object.entries(sec).map(([field, value]) => ({ section, field, value })));
      if (values.length) passportActions.setFields(r.existing.id, values, 'import');
      if (r.category && r.category !== r.existing.category && !bad.has('battery_category')) passportActions.setCategory(r.existing.id, r.category);
      updated++;
    } else {
      if (opts.fillManufacturer) data.operator = { ...org.manufacturer, ...(data.operator ?? {}) };
      passportActions.create({ name: r.name, category: bad.has('battery_category') ? null : r.category, data });
      created++;
    }
  }
  return { created, updated, skipped };
}

// ───────────── units & readings ─────────────
const UNIT_ALIASES: Record<string, string[]> = {
  serial: ['serial', 'serie', 'serial_number', 'nr_serie', 'numar_serie', 'sn', 'unit_serial'],
  batch: ['batch', 'lot', 'batch_number', 'numar_lot', 'nr_lot'],
  manufacturing_date: ['manufacturing_date', 'data_fabricatiei', 'data_fabricatie', 'luna', 'luna_fabricatiei', 'unit_manufacturing_date', 'data'],
  status: ['status', 'stare', 'statut'],
  field: ['field', 'camp', 'parametru', 'marime'],
  value: ['value', 'valoare', 'val'],
  observed_on: ['observed_on', 'data', 'date', 'data_masurarii', 'observat'],
  source: ['source', 'sursa'],
  note: ['note', 'nota', 'observatii', 'comentariu'],
};
/** Maps headers onto the given keys by alias. */
export function mapAliases(headers: string[], keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  headers.forEach((h, i) => { const n = norm(h); for (const k of keys) if (out[k] === undefined && UNIT_ALIASES[k]?.includes(n)) { out[k] = i; break; } });
  return out;
}

const STATUS: Record<string, UnitStatus> = {
  original: 'original', originala: 'original', noua: 'original',
  repurposed: 'repurposed', reutilizata: 'repurposed', reutilizata_in_alt_scop: 'repurposed',
  re_used: 're-used', reused: 're-used', refolosita: 're-used',
  remanufactured: 'remanufactured', reconditionata: 'remanufactured', remanufacturata: 'remanufactured',
  waste: 'waste', deseu: 'waste',
};
export const parseStatus = (s: string): UnitStatus | null => (s.trim() ? STATUS[norm(s)] ?? null : null);
export { parseMonth, parseDate };

export function parseSource(s: string): 'measurement' | 'brand_statement' | 'bms' | 'import' {
  const n = norm(s);
  if (['measurement', 'masurare', 'masuratoare', 'test'].includes(n)) return 'measurement';
  if (['brand_statement', 'declaratie', 'declaratie_producator', 'brand'].includes(n)) return 'brand_statement';
  if (n === 'bms' || n === 'telemetrie') return 'bms';
  return 'import';
}

/** Fields a unit reading can carry: per-battery fields + model values a unit may override. */
export const READING_FIELDS: FieldDef[] = FIELDS.filter(f => f.section === 'unitate' && !['serial_number', 'batch_number', 'unit_manufacturing_date'].includes(f.name))
  .concat(['rated_capacity', 'capacity_fade', 'original_power_capability', 'power_fade', 'initial_round_trip_energy_efficiency', 'energy_round_trip_efficiency_fade', 'initial_internal_resistance_pack', 'internal_resistance_increase', 'expected_lifetime_in_calendar_years', 'expected_lifetime_number_of_charge_discharge_cycles'].map(n => FIELD[n]).filter((f): f is FieldDef => !!f));
export function matchReadingField(raw: string): FieldDef | null {
  const n = norm(raw);
  return READING_FIELDS.find(f => norm(f.name) === n || norm(f.label_ro) === n || norm(f.label) === n) ?? null;
}
