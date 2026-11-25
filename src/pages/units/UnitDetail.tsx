import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import '../../styles/units.css';
import { useDB } from '../../api/store';
import { units as unitActions } from '../../api/actions';
import { FIELD, UNIT_RO, requirementOf, unitFields, unitOf } from '../../data/catalog';
import { canTransition, filled } from '../../lib/validation';
import { digitalLink } from '../../lib/gs1';
import { formatValue } from '../../lib/present';
import { fmtDate, fmtMonth, fmtRelative } from '../../lib/format';
import { FieldInput } from '../../components/FieldInput';
import { QrCode } from '../../components/Codes';
import { ConfirmButton, CopyButton, Empty, Field, Icon, Modal, UNIT_STATUS_LABEL, UnitStatusBadge, useToast } from '../../components/ui';
import { SOURCE_LABEL, STATUS_ORDER, effectiveValue, recordableFields, soh, today, useRoutePassport } from './_unitHelpers';
import { SohCell } from './_UnitWidgets';
import type { Reading, UnitStatus } from '../../types';

export default function UnitDetail() {
  const p = useRoutePassport();
  const { unitId } = useParams();
  const u = useDB(d => d.units.find(x => x.id === unitId));
  const allReadings = useDB(d => d.readings);
  const resolver = useDB(d => d.org.resolver);
  const secondLife = useDB(d => d.passports.find(x => x.id === u?.secondLifePassportId));
  const nav = useNavigate();
  const toast = useToast();
  const [recording, setRecording] = useState(false);
  const [changing, setChanging] = useState(false);
  const readings = useMemo(() => allReadings.filter(r => r.unitId === unitId).sort((a, b) => b.observedOn.localeCompare(a.observedOn) || b.recordedAt.localeCompare(a.recordedAt)), [allReadings, unitId]);

  if (!p || !u) return <div className="card"><Empty icon="battery" title="Bateria nu există" action={<Link className="btn" to="..">Înapoi la baterii</Link>} /></div>;

  const link = digitalLink(resolver, p.gtin, { serial: u.serial });
  const fields = unitFields(p.category).filter(f => !['serial_number', 'batch_number', 'unit_manufacturing_date'].includes(f.name));
  const valueOf = (name: string) => name === 'status' ? { value: u.status, source: 'brand_statement' } : effectiveValue(u, name, p, readings);

  return (
    <div className="stack lg">
      <div className="row"><Link to=".." relative="path" className="linkbtn small"><Icon name="chevronLeft" size={14} /> Toate bateriile</Link></div>

      <div className="card u-head">
        <div className="stack">
          <div className="row"><h2 className="mono" style={{ fontSize: 20 }}>{u.serial}</h2><UnitStatusBadge status={u.status} /></div>
          <dl className="kv" style={{ maxWidth: 520 }}>
            <dt>Lot</dt><dd className="mono">{u.batch ?? '—'}</dd>
            <dt>Fabricată</dt><dd>{fmtMonth(u.manufacturingDate ?? (p.data?.identificare?.manufacturing_date as string | undefined))}</dd>
            <dt>SoH</dt><dd><SohCell value={soh(u, p)} /></dd>
            <dt>Actualizată</dt><dd>{fmtRelative(u.updatedAt)}</dd>
          </dl>
          {secondLife && <div className="callout info small"><Icon name="recycle" />A doua viață: <Link to={`/pasapoarte/${secondLife.id}`}>{secondLife.name}</Link></div>}
          <div className="row">
            <button className="btn primary" onClick={() => setRecording(true)}><Icon name="plus" />Înregistrează valoare</button>
            <button className="btn" onClick={() => setChanging(true)}><Icon name="refresh" />Schimbă statusul</button>
            <a className="btn" href={`/p/${p.id}?unit=${encodeURIComponent(u.serial)}`} target="_blank" rel="noreferrer"><Icon name="eye" />Pagina publică</a>
            <ConfirmButton className="btn ghost danger" confirmText="Șterge definitiv" onConfirm={() => { unitActions.remove(u.id); toast('Baterie ștearsă'); nav('..', { relative: 'path' }); }}><Icon name="trash" />Șterge</ConfirmButton>
          </div>
        </div>
        <div className="stack sm" style={{ justifyItems: 'center' }}>
          <QrCode value={link} size={148} title={link ?? undefined} />
          {link ? <><span className="mono faint small" style={{ maxWidth: 180, textAlign: 'center', overflowWrap: 'anywhere' }}>{link}</span><CopyButton text={link} label="Copiază link" /></>
            : <span className="faint small">Completează GTIN-ul modelului</span>}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-head"><h3>Valori curente</h3></div>
          <dl className="u-kv">
            {fields.map(f => {
              const { value, source } = valueOf(f.name);
              const req = requirementOf(f, p.category);
              const missing = !filled(value) && (req === 'required' || req === 'later');
              return [
                <dt key={f.name + 't'}>{f.label_ro}</dt>,
                <dd key={f.name + 'd'}>{filled(value) ? (f.name === 'status' ? UNIT_STATUS_LABEL[value as UnitStatus] : formatValue(f, value, p.data)) : missing ? <span className="badge warn">lipsă{req === 'later' ? ' din 2027' : ''}</span> : <span className="faint">—</span>}</dd>,
                <dd key={f.name + 's'} className="s">{source && filled(value) ? <span className={'u-src' + (source === 'model' ? ' model' : source === 'bms' ? ' bms' : '')}>{SOURCE_LABEL[source] ?? source}</span> : null}</dd>,
              ];
            })}
          </dl>
        </section>

        <section className="card">
          <div className="card-head"><h3>Istoric</h3><span className="faint small">{readings.length} înregistrări</span></div>
          {readings.length === 0 ? <p className="faint">Nicio valoare înregistrată.</p> : (
            <div className="timeline">
              {readings.slice(0, 60).map(r => <HistoryItem key={r.id} r={r} data={p.data} />)}
            </div>
          )}
        </section>
      </div>

      {recording && <RecordModal passportCategory={p.category} unitId={u.id} onClose={() => setRecording(false)} modelData={p.data} />}
      {changing && <StatusModal unitId={u.id} from={u.status} serial={u.serial} passportName={p.name} onClose={() => setChanging(false)} />}
    </div>
  );
}

function HistoryItem({ r, data }: { r: Reading; data: Record<string, Record<string, unknown>> }) {
  const f = FIELD[r.field];
  const v = r.field === 'status' ? UNIT_STATUS_LABEL[r.value as UnitStatus] ?? String(r.value) : f ? formatValue(f, r.value, data) : String(r.value);
  return (
    <div className="ev">
      <span className="pt" style={r.field === 'status' ? { background: 'var(--warn)' } : undefined} />
      <div className="stack sm" style={{ gap: 2 }}>
        <div className="row" style={{ gap: 6 }}><b>{f?.label_ro ?? r.field}</b><span>{v}</span><span className={'u-src' + (r.source === 'bms' ? ' bms' : '')}>{SOURCE_LABEL[r.source] ?? r.source}</span></div>
        {r.note && <span className="muted small">{r.note}</span>}
        <span className="faint small">{fmtDate(r.observedOn)} · {r.recordedBy}</span>
      </div>
    </div>
  );
}

function RecordModal({ unitId, passportCategory, onClose, modelData }: { unitId: string; passportCategory: string | null; onClose: () => void; modelData: Record<string, Record<string, unknown>> }) {
  const toast = useToast();
  const opts = recordableFields(passportCategory);
  const [field, setField] = useState(opts[0]?.name ?? '');
  const [value, setValue] = useState<unknown>(undefined);
  const [date, setDate] = useState(today());
  const [source, setSource] = useState<Reading['source']>('measurement');
  const [note, setNote] = useState('');
  const f = FIELD[field];
  const unit = f ? unitOf(f, modelData) : undefined;
  return (
    <Modal title="Înregistrează o valoare" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Anulează</button>
      <button className="btn primary" disabled={!f || !filled(value) || !date} onClick={() => {
        unitActions.recordReading(unitId, { field, value, observedOn: date, source, note: note || undefined });
        toast('Valoare salvată'); onClose();
      }}>Salvează</button></>}>
      <Field label="Ce măsori" htmlFor="rd-field">
        <select id="rd-field" className="select" value={field} onChange={e => { setField(e.target.value); setValue(undefined); }}>
          {opts.map(o => <option key={o.name} value={o.name}>{o.label_ro}{o.unit ? ` (${UNIT_RO[o.unit] ?? o.unit})` : ''}</option>)}
        </select>
      </Field>
      {f && <FieldInput key={field} field={f} value={value} onChange={setValue} unitValue={unit} compact category={passportCategory} idPrefix="rd-" />}
      <div className="form-grid">
        <Field label="Data" htmlFor="rd-date"><input id="rd-date" className="input" type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Sursa" htmlFor="rd-src">
          <select id="rd-src" className="select" value={source} onChange={e => setSource(e.target.value as Reading['source'])}>
            <option value="measurement">Măsurătoare</option><option value="brand_statement">Declarație</option><option value="bms">BMS</option>
          </select>
        </Field>
      </div>
      <Field label="Notă" htmlFor="rd-note"><input id="rd-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="opțional" /></Field>
    </Modal>
  );
}

function StatusModal({ unitId, from, serial, passportName, onClose }: { unitId: string; from: UnitStatus; serial: string; passportName: string; onClose: () => void }) {
  const toast = useToast();
  const nav = useNavigate();
  const [to, setTo] = useState<UnitStatus>(STATUS_ORDER.find(s => canTransition(from, s)) ?? 'repurposed');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [confirmFix, setConfirmFix] = useState(false);
  const [newPassport, setNewPassport] = useState(true);
  const allowed = canTransition(from, to);
  const secondLife = ['repurposed', 'remanufactured', 're-used'].includes(to);
  const save = () => {
    unitActions.changeStatus(unitId, to, { observedOn: date, note: note || undefined, correction: !allowed });
    if (secondLife && newPassport) {
      const np = unitActions.startSecondLife(unitId, `${passportName} — a doua viață ${serial}`);
      toast('Status salvat. Pașaport nou creat.');
      onClose();
      if (np) nav(`/pasapoarte/${np.id}`);
      return;
    }
    toast('Status salvat'); onClose();
  };
  return (
    <Modal title="Schimbă statusul" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Anulează</button>
      <button className="btn primary" disabled={to === from || (!allowed && !confirmFix)} onClick={save}>{allowed ? 'Salvează' : 'Salvează corecția'}</button></>}>
      <div className="chips" role="radiogroup" aria-label="Status nou">
        {STATUS_ORDER.map(s => (
          <label key={s} className={'chip' + (to === s ? ' on' : '')} style={s === from ? { opacity: .5 } : undefined}>
            <input type="radio" name="st" checked={to === s} disabled={s === from} onChange={() => { setTo(s); setConfirmFix(false); }} />{UNIT_STATUS_LABEL[s]}
          </label>
        ))}
      </div>
      {!allowed && to !== from && (
        <div className="callout warn small">
          <Icon name="alert" />
          <div className="stack sm">
            <span>{from === 'waste' ? 'Deșeul e status final.' : 'O baterie nu mai poate redeveni originală.'} Folosește doar pentru a corecta o greșeală — ambele înregistrări rămân în istoric.</span>
            <label className="check"><input type="checkbox" checked={confirmFix} onChange={e => setConfirmFix(e.target.checked)} />Confirm că este o corecție</label>
          </div>
        </div>
      )}
      <div className="form-grid">
        <Field label="Data" htmlFor="st-date"><input id="st-date" className="input" type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Notă" htmlFor="st-note"><input id="st-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="ex. preluată de EnerReuse SRL" /></Field>
      </div>
      {secondLife && allowed && (
        <label className="check"><input type="checkbox" checked={newPassport} onChange={e => setNewPassport(e.target.checked)} />Creează pașaportul pentru a doua viață (Art. 77(7))</label>
      )}
    </Modal>
  );
}
