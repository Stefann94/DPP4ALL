// Shared helpers for the battery-unit screens.
import { useParams } from 'react-router-dom';
import { useDB } from '../../api/store';
import { FIELD, unitFields } from '../../data/catalog';
import type { Passport, Reading, Unit, UnitStatus } from '../../types';

export const STATUS_ORDER: UnitStatus[] = ['original', 'repurposed', 're-used', 'remanufactured', 'waste'];
/** Categorical slots 1–5 (reference palette), fixed order by status. */
export const STATUS_COLOR: Record<UnitStatus, string> = {
  original: 'var(--viz-1)', repurposed: 'var(--viz-2)', 're-used': 'var(--viz-3)', remanufactured: 'var(--viz-4)', waste: 'var(--viz-5)',
};

export const SOURCE_LABEL: Record<string, string> = {
  measurement: 'Măsurătoare', brand_statement: 'Declarație', bms: 'BMS', import: 'Import', model: 'Valoare model',
};

/** Passport from the :id route param (works inside the passport layout or standalone). */
export function useRoutePassport(): Passport | undefined {
  const { id } = useParams();
  return useDB(d => d.passports.find(p => p.id === id));
}

/** Model values a unit inherits while it has no reading of its own (when modelStartingValues is on). */
const MODEL_FALLBACK: Record<string, string> = {
  remaining_capacity: 'rated_capacity',
  self_discharge_rate: 'initial_self_discharge_rate',
  self_discharge_rate_per_year: 'initial_self_discharge_rate_per_year',
  ohmic_resistance: 'initial_internal_resistance_pack',
  remaining_power_capability: 'original_power_capability',
  remaining_round_trip_efficiency: 'initial_round_trip_energy_efficiency',
};

export function effectiveValue(u: Unit, field: string, p: Passport | undefined, readings: Reading[]): { value: unknown; source: string | null } {
  const own = u.values?.[field];
  const latest = readings.filter(r => r.unitId === u.id && r.field === field).sort((a, b) => b.observedOn.localeCompare(a.observedOn) || b.recordedAt.localeCompare(a.recordedAt))[0];
  if (own !== undefined && own !== null && own !== '') return { value: own, source: latest?.source ?? (field === 'status' ? 'brand_statement' : 'import') };
  if (p?.modelStartingValues) {
    if (field === 'state_of_certified_energy') return { value: 100, source: 'model' };
    const mf = MODEL_FALLBACK[field];
    if (mf) { const f = FIELD[mf]; const v = f ? p.data?.[f.section]?.[mf] : undefined; if (v !== undefined && v !== null && v !== '') return { value: v, source: 'model' }; }
  }
  return { value: undefined, source: null };
}

export function ratedCapacity(p?: Passport): number | null {
  const v = p?.data?.performanta?.rated_capacity ?? p?.data?.identificare?.rated_capacity;
  return typeof v === 'number' && v > 0 ? v : null;
}

/** State of health in % = remaining capacity / rated capacity. */
export function soh(u: Unit, p?: Passport): number | null {
  const rc = ratedCapacity(p);
  const cap = u.values?.remaining_capacity;
  if (!rc || typeof cap !== 'number') return null;
  return Math.round((cap / rc) * 1000) / 10;
}

export const SOH_BUCKETS = [
  { key: '90', label: '≥ 90%', test: (v: number) => v >= 90 },
  { key: '80', label: '80–90%', test: (v: number) => v >= 80 && v < 90 },
  { key: '70', label: '70–80%', test: (v: number) => v >= 70 && v < 80 },
  { key: 'lt70', label: '< 70%', test: (v: number) => v < 70 },
];

/** Unit fields the user can record a reading for (all applicable except status and identity fields). */
export const recordableFields = (category: string | null) =>
  unitFields(category).filter(f => !['status', 'serial_number', 'batch_number', 'unit_manufacturing_date'].includes(f.name));

export const today = () => new Date().toISOString().slice(0, 10);
