// Renders one catalogue field as the right control. Used by the passport editor, units and import mapping.
import { useEffect, useId, useState } from 'react';
import { FIELD, UNIT_RO, requirementOf, type FieldDef } from '../data/catalog';
import { formatError, filled } from '../lib/validation';
import { checkGtin } from '../lib/gs1';
import { RequirementBadge, TierBadge } from './ui';

const LONG = new Set(['product_description', 'extinguishing_agent', 'meaning_of_labels_and_symbols', 'impact_of_substances', 'waste_battery_safety_instructions', 'negative_events', 'critical_raw_materials', 'cycle_life_reference_test', 'temperature_range_idle_state_reference_test', 'manufacturer_address']);

export interface FieldInputProps {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  /** Value of the companion unit selector (e.g. battery_mass_unit) and its setter. */
  unitValue?: string;
  onUnitChange?: (v: string) => void;
  category?: string | null;
  error?: string | null;
  advice?: string | null;
  compact?: boolean;      // hide badges/help (tables, unit cards)
  readOnly?: boolean;
  idPrefix?: string;
  showHelp?: boolean;
}

/** Text inputs keep a local draft so typing stays smooth; commit on change. */
function useDraft(value: unknown) {
  const [d, setD] = useState(value == null ? '' : String(value));
  useEffect(() => { setD(value == null ? '' : String(value)); }, [value]);
  return [d, setD] as const;
}

export function FieldInput(p: FieldInputProps) {
  const { field: f, value, onChange, compact, readOnly } = p;
  const id = (p.idPrefix ?? 'f-') + f.name;
  const req = requirementOf(f, p.category);
  const err = p.error ?? formatError(f, value);
  const [draft, setDraft] = useDraft(f.type === 'array' ? (Array.isArray(value) ? value.join('\n') : '') : value);
  const listId = useId();
  let control: React.ReactNode;
  let wide = false;
  const invalid = err ? ' invalid' : '';

  switch (f.type) {
    case 'number': {
      const uf = f.unit_field ? FIELD[f.unit_field] : undefined;
      const unit = p.unitValue ?? f.unit;
      const input = <input id={id} className={'input' + invalid} type="number" step="any" min={f.min} max={f.max} readOnly={readOnly} value={draft}
        onChange={e => { setDraft(e.target.value); onChange(e.target.value === '' ? undefined : Number(e.target.value)); }} />;
      control = (
        <div className="input-affix">
          {input}
          {uf?.options && p.onUnitChange && !readOnly
            ? <select className="affix" aria-label="Unitate" value={unit} onChange={e => p.onUnitChange!(e.target.value)}>{uf.options.map(o => <option key={o.value} value={o.value}>{UNIT_RO[o.value] ?? o.value}</option>)}</select>
            : unit ? <span className="affix">{UNIT_RO[unit] ?? unit}</span> : null}
        </div>
      );
      if (!unit && !uf) control = input;
      break;
    }
    case 'select': {
      const opts = f.options ?? [];
      control = <select id={id} className={'select' + invalid} disabled={readOnly} value={String(value ?? '')} onChange={e => onChange(e.target.value || undefined)}>
        <option value="">—</option>{opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
      break;
    }
    case 'multiselect': {
      const sel = new Set(Array.isArray(value) ? (value as string[]) : []);
      wide = (f.options?.length ?? 0) > 6;
      control = <div className="chips" id={id} role="group">{(f.options ?? []).map(o => (
        <label key={o.value} className="chip"><input type="checkbox" disabled={readOnly} checked={sel.has(o.value)} onChange={e => { const n = new Set(sel); e.target.checked ? n.add(o.value) : n.delete(o.value); onChange([...n]); }} />{o.label}</label>))}</div>;
      break;
    }
    case 'array':
      wide = true;
      control = <textarea id={id} className={'textarea' + invalid} rows={3} readOnly={readOnly} placeholder="Câte un element pe rând" value={draft}
        onChange={e => { setDraft(e.target.value); onChange(e.target.value.split('\n').map(x => x.trim()).filter(Boolean)); }} />;
      break;
    case 'pictogram':
      control = <label className="check"><input id={id} type="checkbox" disabled={readOnly} checked={value === true} onChange={e => onChange(e.target.checked)} />Simbolul apare pe baterie</label>;
      break;
    case 'month':
    case 'date':
      control = <input id={id} className={'input' + invalid} type={f.type} readOnly={readOnly} value={String(value ?? '')} onChange={e => onChange(e.target.value || undefined)} />;
      break;
    case 'url':
      control = <input id={id} className={'input' + invalid} type="url" placeholder="https://" readOnly={readOnly} value={draft} onChange={e => { setDraft(e.target.value); onChange(e.target.value.trim() || undefined); }} />;
      break;
    default: {
      const upper = /_country$/.test(f.name) || f.name === 'eori_number';
      if (LONG.has(f.name)) {
        wide = !compact;
        control = <textarea id={id} className={'textarea' + invalid} rows={2} readOnly={readOnly} placeholder={f.placeholder} value={draft} onChange={e => { setDraft(e.target.value); onChange(e.target.value || undefined); }} />;
      } else {
        control = <>
          <input id={id} className={'input' + invalid} type={f.name.includes('email') ? 'email' : 'text'} readOnly={readOnly} list={upper && /_country$/.test(f.name) ? listId : undefined}
            placeholder={f.placeholder ?? (/_country$/.test(f.name) ? 'RO' : f.name === 'gtin' ? '13 cifre de sub codul de bare' : '')}
            value={draft} maxLength={/_country$/.test(f.name) ? 2 : undefined}
            onChange={e => { const t = upper ? e.target.value.toUpperCase() : e.target.value; setDraft(t); onChange(t || undefined); }} />
          {/_country$/.test(f.name) && <datalist id={listId}>{['RO', 'DE', 'FR', 'IT', 'ES', 'PL', 'NL', 'BE', 'AT', 'HU', 'BG', 'CZ', 'CN', 'KR', 'JP', 'US', 'TR', 'GB'].map(c => <option key={c} value={c} />)}</datalist>}
        </>;
      }
    }
  }

  let note: React.ReactNode = null;
  if (f.name === 'gtin' && filled(value)) {
    const g = checkGtin(value);
    if (g?.ok) note = <span className="hint mono" style={{ color: 'var(--ok)' }}>GTIN-14: {g.gtin14}</span>;
    else if (g && !g.ok && g.suggestion) note = <span className="hint">Poate ai vrut <button type="button" className="linkbtn" onClick={() => onChange(g.suggestion)}>{g.suggestion}</button>?</span>;
  }

  return (
    <div className={'field' + (wide ? ' wide' : '')} data-field={f.name}>
      <label htmlFor={id}>
        <span className={filled(value) && !err ? '' : undefined}>{f.label_ro.replace(/ \((GS1 AI \d+|ISO 3166)\)$/, '')}</span>
        {!compact && <RequirementBadge req={req} from={f.required_from} />}
        {!compact && f.access_tier !== 'public' && <TierBadge tier={f.access_tier} />}
      </label>
      {control}
      {err ? <span className="error">{err}</span> : p.advice ? <span className="advice">{p.advice}</span> : note}
      {!compact && p.showHelp && f.description && <span className="hint">{f.description}</span>}
    </div>
  );
}
