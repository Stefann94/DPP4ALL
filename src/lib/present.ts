// Human-readable rendering of field values (public page, version diff, unit detail, exports).
import { FIELD, optionLabel, unitOf, UNIT_RO, type FieldDef } from '../data/catalog';
import { fmtMonth, fmtNumber, fmtDate } from './format';
import type { PassportData } from '../types';

export function formatValue(f: FieldDef, v: unknown, data?: PassportData): string {
  if (v === undefined || v === null || v === '') return '—';
  switch (f.type) {
    case 'select': return optionLabel(f, v);
    case 'multiselect': return (Array.isArray(v) ? v : [v]).map(x => optionLabel(f, x)).join(', ');
    case 'array': return Array.isArray(v) ? v.join('; ') : String(v);
    case 'pictogram': return v ? 'Da' : 'Nu';
    case 'month': return fmtMonth(String(v));
    case 'date': return fmtDate(String(v));
    case 'number': {
      const u = unitOf(f, data);
      return `${fmtNumber(v as number, 4)}${u ? ' ' + (UNIT_RO[u] ?? u) : ''}`;
    }
    default: return String(v);
  }
}

export const formatByName = (name: string, v: unknown, data?: PassportData) => (FIELD[name] ? formatValue(FIELD[name], v, data) : String(v ?? '—'));

/** Flatten passport data into [field, value] pairs (for diff/export). */
export function flatten(data: PassportData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const sec of Object.values(data ?? {})) for (const [k, v] of Object.entries(sec ?? {})) out[k] = v;
  return out;
}

/** Field-level diff between two data snapshots. */
export function diffData(a: PassportData, b: PassportData): { field: string; before: unknown; after: unknown }[] {
  const fa = flatten(a), fb = flatten(b);
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  const out: { field: string; before: unknown; after: unknown }[] = [];
  for (const k of keys) if (JSON.stringify(fa[k]) !== JSON.stringify(fb[k])) out.push({ field: k, before: fa[k], after: fb[k] });
  return out;
}
