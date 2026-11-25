import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDB } from '../../api/store';
import { passports as pa } from '../../api/actions';
import { CATEGORIES, FIELDS, applies, isMandatory } from '../../data/catalog';
import { checkGtin } from '../../lib/gs1';
import { Callout, Field, Icon, Modal, PageHead } from '../../components/ui';
import type { BatteryCategory } from '../../types';
import '../../styles/passports.css';

const DESC: Record<BatteryCategory, string> = {
  industrial_stationary: 'Stocare acasă sau comercială, peste 2 kWh',
  industrial_other: 'Utilaje, stivuitoare, UPS mari, peste 2 kWh',
  ev: 'Tracțiune auto, camion, autobuz',
  lmt: 'Biciclete, trotinete, moto ușoare (≤ 25 kg)',
  portable: 'Sigilată, ≤ 5 kg (AA, telefoane, unelte)',
  sli: 'Pornire, iluminare, aprindere',
  industrial_up_to_2kwh: 'Industrială de cel mult 2 kWh',
};
const mandatoryCount = (c: BatteryCategory) => FIELDS.filter(f => f.name !== 'battery_category' && applies(f, c) && isMandatory(f, c)).length;

type Q = { q: string; options: { label: string; next: Q | BatteryCategory }[] };
const STATIONARY: Q = { q: 'Are stocare integrată și livrează energie către rețea sau utilizatori?', options: [{ label: 'Da', next: 'industrial_stationary' }, { label: 'Nu', next: 'industrial_other' }] };
const CAPACITY: Q = { q: 'Capacitatea este de cel mult 2 kWh?', options: [{ label: 'Da', next: 'industrial_up_to_2kwh' }, { label: 'Nu, peste 2 kWh', next: STATIONARY }] };
const PORTABLE: Q = { q: 'Este sigilată, de cel mult 5 kg și nu e făcută special pentru uz industrial?', options: [{ label: 'Da', next: 'portable' }, { label: 'Nu', next: CAPACITY }] };
const SLI: Q = { q: 'Alimentează pornirea, iluminarea sau aprinderea unui vehicul, ambarcațiuni sau utilaj?', options: [{ label: 'Da', next: 'sli' }, { label: 'Nu', next: PORTABLE }] };
const LIGHT: Q = { q: 'Cântărește cel mult 25 kg și e sigilată?', options: [{ label: 'Da', next: 'lmt' }, { label: 'Nu, peste 25 kg', next: 'ev' }] };
const ROOT: Q = { q: 'Bateria pune în mișcare un vehicul?', options: [
  { label: 'Da: auto, camion, autobuz, remorcă', next: 'ev' },
  { label: 'Da: bicicletă, trotinetă, moto ușoară', next: LIGHT },
  { label: 'Nu', next: SLI },
] };

function Helper({ onPick, onClose }: { onPick: (c: BatteryCategory) => void; onClose: () => void }) {
  const [path, setPath] = useState<Q[]>([ROOT]);
  const [result, setResult] = useState<BatteryCategory | null>(null);
  const cur = path[path.length - 1]!;
  return (
    <Modal title="Ce categorie am?" onClose={onClose}
      footer={<>
        {(path.length > 1 || result) && <button className="btn" onClick={() => { if (result) setResult(null); else setPath(p => p.slice(0, -1)); }}>Înapoi</button>}
        {result && <button className="btn primary" onClick={() => onPick(result)}>Alege</button>}
      </>}>
      {result ? (
        <div className="stack">
          <span className="small muted">Rezultat</span>
          <h2>{CATEGORIES.find(c => c.value === result)!.label}</h2>
          <span className="muted">{DESC[result]}</span>
          <Callout kind="info">Mai multe unități conectate la un BMS comun se socotesc o singură baterie: adună capacitățile.</Callout>
        </div>
      ) : (
        <div className="stack">
          <span className="small faint">Întrebarea {path.length}</span>
          <h3 style={{ fontSize: 17 }}>{cur.q}</h3>
          <div className="stack sm">
            {cur.options.map(o => <button key={o.label} className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => typeof o.next === 'string' ? setResult(o.next) : setPath(p => [...p, o.next as Q])}>{o.label}</button>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function NewPassport() {
  const nav = useNavigate();
  const allPassports = useDB(d => d.passports);
  const existing = useMemo(() => allPassports.filter(p => p.status !== 'trashed'), [allPassports]);
  const [cat, setCat] = useState<BatteryCategory | null>(null);
  const [helper, setHelper] = useState(false);
  const [name, setName] = useState('');
  const [gtin, setGtin] = useState('');
  const [from, setFrom] = useState('');
  const g = checkGtin(gtin);
  const gtinErr = g && !g.ok ? g.message : null;

  const create = () => {
    if (!cat || !name.trim() || gtinErr) return;
    const src = existing.find(p => p.id === from);
    let data = src ? structuredClone(src.data) : undefined;
    if (data) { delete data.identificare?.gtin; data.identificare = { ...(data.identificare ?? {}), battery_category: cat }; }
    const p = pa.create({ name: name.trim(), category: cat, data });
    if (gtin.trim()) pa.setField(p.id, 'identificare', 'gtin', gtin.trim());
    nav(`/pasapoarte/${p.id}`);
  };

  const group = (profile: 'battery_full' | 'battery_basic', title: string, sub: string) => (
    <div className="stack sm">
      <div className="row between"><h3>{title}</h3><span className="small faint">{sub}</span></div>
      <div className="cat-cards">
        {CATEGORIES.filter(c => c.profile === profile).map(c => (
          <button key={c.value} className="cat-card" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}>
            <b>{c.label}</b><span>{DESC[c.value]}</span><span className="faint num">{mandatoryCount(c.value)} câmpuri obligatorii</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page narrow">
      <PageHead title="Pașaport nou" crumbs={<><Link to="/pasapoarte">Pașapoarte</Link><span>/</span><span>Nou</span></>} />
      <div className="card stack lg">
        <div className="row between"><h2>1. Categoria bateriei</h2><button className="linkbtn" onClick={() => setHelper(true)}><Icon name="info" size={14} /> Ajută-mă să aleg</button></div>
        {group('battery_full', 'Pașaport complet', 'Art. 77 · din 18.02.2027')}
        {group('battery_basic', 'Informații prin QR', 'Art. 13(6) · fără pașaport complet')}
      </div>

      <div className="card stack" style={{ opacity: cat ? 1 : 0.55 }} aria-disabled={!cat}>
        <h2>2. Produsul</h2>
        <div className="form-grid">
          <Field label="Denumire produs" htmlFor="np-name"><input id="np-name" className="input" disabled={!cat} value={name} onChange={e => setName(e.target.value)} placeholder="ex. HomeCell 10 kWh" onKeyDown={e => e.key === 'Enter' && create()} /></Field>
          <Field label="GTIN" htmlFor="np-gtin" hint="Opțional acum, obligatoriu la publicare" error={gtinErr}>
            <input id="np-gtin" className={'input' + (gtinErr ? ' invalid' : '')} disabled={!cat} inputMode="numeric" value={gtin} onChange={e => setGtin(e.target.value.replace(/\s/g, ''))} placeholder="5941234567890" />
          </Field>
          <Field label="Pornește de la" htmlFor="np-from" hint={from ? 'Se copiază toate datele, fără GTIN' : 'Datele producătorului se completează automat'}>
            <select id="np-from" className="select" disabled={!cat} value={from} onChange={e => setFrom(e.target.value)}>
              <option value="">Pașaport gol</option>
              {existing.map(p => <option key={p.id} value={p.id}>Copie după {p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="row end"><Link className="btn" to="/pasapoarte">Anulează</Link><button className="btn primary" disabled={!cat || !name.trim() || !!gtinErr} onClick={create}>Creează pașaportul<Icon name="arrowRight" /></button></div>
      </div>

      {helper && <Helper onClose={() => setHelper(false)} onPick={c => { setCat(c); setHelper(false); }} />}
    </div>
  );
}
