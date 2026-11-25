import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePassportCtx } from './_ctx';
import { useDB } from '../../api/store';
import { passports as pa } from '../../api/actions';
import { CATEGORIES, FIELDS, applies, categoryLabel, isMandatory, profileOf } from '../../data/catalog';
import { digitalLink } from '../../lib/gs1';
import { toEN18223 } from '../../lib/en18223';
import { downloadJson } from '../../lib/download';
import { Callout, ConfirmButton, CopyButton, Icon, Switch, useToast } from '../../components/ui';
import type { BatteryCategory } from '../../types';
import '../../styles/passports.css';

export default function SettingsTab() {
  const { passport: p } = usePassportCtx();
  const org = useDB(d => d.org);
  const docs = useDB(d => d.documents);
  const role = useDB(d => d.session?.role);
  const source = useDB(d => (p.linkedFromPassportId ? d.passports.find(x => x.id === p.linkedFromPassportId) : undefined));
  const allPassports = useDB(d => d.passports);
  const children = useMemo(() => allPassports.filter(x => x.linkedFromPassportId === p.id), [allPassports, p.id]);
  const nav = useNavigate();
  const toast = useToast();
  const [next, setNext] = useState<BatteryCategory | ''>('');
  const canEdit = role !== 'viewer';
  const trashed = p.status === 'trashed';
  const link = digitalLink(org.resolver, p.gtin);
  const json = useMemo(() => toEN18223(p, org, { documents: docs }), [p, org, docs]);

  const impact = useMemo(() => {
    if (!next) return null;
    const mand = (c: string | null) => new Set(FIELDS.filter(f => applies(f, c) && isMandatory(f, c)).map(f => f.name));
    const a = mand(p.category), b = mand(next);
    const lost = [...a].filter(x => !b.has(x)).length, gained = [...b].filter(x => !a.has(x)).length;
    return { lost, gained, profileChange: profileOf(p.category) !== profileOf(next) };
  }, [next, p.category]);

  return (
    <div className="stack lg">
      <div className="card stack">
        <h2>Categorie</h2>
        <div className="row">
          <span className="muted">Acum: <b style={{ color: 'var(--ink)' }}>{categoryLabel(p.category)}</b></span>
          {canEdit && !trashed && <>
            <select className="select" style={{ width: 'auto' }} value={next} onChange={e => setNext(e.target.value as BatteryCategory | '')} aria-label="Categorie nouă">
              <option value="">Schimbă în…</option>{CATEGORIES.filter(c => c.value !== p.category).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {next && <button className="btn primary" onClick={() => { pa.setCategory(p.id, next); setNext(''); toast('Categorie schimbată'); }}>Aplică</button>}
          </>}
        </div>
        {impact && <Callout kind="warn">{impact.gained} câmpuri devin obligatorii, {impact.lost} nu se mai cer{impact.profileChange ? '. Se schimbă și tipul pașaportului (complet ↔ informații QR).' : '.'} Datele existente rămân salvate.</Callout>}
        {profileOf(p.category) === 'battery_full' && (
          <Switch checked={p.modelStartingValues} onChange={v => canEdit && pa.setModelStartingValues(p.id, v)} label="Valorile modelului sunt valori de pornire pentru baterii" />
        )}
      </div>

      <div className="card stack">
        <h2>Link și date publice</h2>
        <div className="row">
          <span className="mono grow" style={{ overflowWrap: 'anywhere' }}>{link ?? 'Fără GTIN valid: linkul GS1 nu există încă.'}</span>
          {link && <CopyButton text={link} />}
          <a className="btn sm" href={`/p/${p.id}`} target="_blank" rel="noopener"><Icon name="external" />Pagina publică</a>
        </div>
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>JSON EN 18223 (public)</summary>
          <div className="stack" style={{ marginTop: 8 }}>
            <pre className="json-pre">{JSON.stringify(json, null, 2)}</pre>
            <div className="row"><CopyButton text={JSON.stringify(json, null, 2)} /><button className="btn sm" onClick={() => downloadJson(json, `${p.gtin ?? p.id}-en18223.json`)}><Icon name="download" />Descarcă</button></div>
          </div>
        </details>
      </div>

      {(source || children.length > 0) && (
        <div className="card stack">
          <h2>A doua viață</h2>
          {source && <p>Creat din <Link to={`/pasapoarte/${source.id}`}>{source.name}</Link>{p.linkedFromUnitSerial && <> · bateria <span className="mono">{p.linkedFromUnitSerial}</span></>}</p>}
          {children.map(c => <p key={c.id}>Pașaport nou: <Link to={`/pasapoarte/${c.id}`}>{c.name}</Link>{c.linkedFromUnitSerial && <> · din <span className="mono">{c.linkedFromUnitSerial}</span></>}</p>)}
        </div>
      )}

      {canEdit && (
        <div className="card stack danger-zone">
          <h2>Zonă periculoasă</h2>
          <div className="row">
            {p.status === 'published' && <ConfirmButton className="btn" confirmText="Confirmă retragerea" onConfirm={() => { pa.unpublish(p.id); toast('Retras. Codul QR afișează „indisponibil”.'); }}>Retrage de la publicare</ConfirmButton>}
            {!trashed && <ConfirmButton onConfirm={() => { pa.trash(p.id); toast('Mutat în coș'); }}>Mută în coș</ConfirmButton>}
            {trashed && <>
              <button className="btn" onClick={() => { pa.restore(p.id); toast('Restaurat'); }}>Restaurează</button>
              <ConfirmButton confirmText="Șterge definitiv, cu baterii și istoric" onConfirm={() => { pa.deleteForever(p.id); toast('Șters definitiv'); nav('/pasapoarte'); }}>Șterge definitiv</ConfirmButton>
            </>}
          </div>
          {p.status === 'published' && <span className="small muted">Pașaportul bateriei trebuie să rămână disponibil până după reciclare (Art. 77(8)).</span>}
        </div>
      )}
    </div>
  );
}
