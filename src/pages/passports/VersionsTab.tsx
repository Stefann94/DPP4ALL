import { useMemo, useState } from 'react';
import { usePassportCtx } from './_ctx';
import { useDB } from '../../api/store';
import { passports as pa } from '../../api/actions';
import { FIELD } from '../../data/catalog';
import { diffData, formatByName } from '../../lib/present';
import { fmtDateTime } from '../../lib/format';
import { copyText } from '../../lib/download';
import { ConfirmButton, Empty, Icon, Modal, useToast } from '../../components/ui';
import type { PassportVersion } from '../../types';
import '../../styles/passports.css';

const KIND: Record<PassportVersion['kind'], [string, string]> = { publish: ['ok', 'Publicare'], save: ['', 'Salvare'], restore: ['warn', 'Restaurare'], import: ['accent', 'Import'] };
const CURRENT = '__current';

export default function VersionsTab() {
  const { passport: p } = usePassportCtx();
  const all = useDB(d => d.versions);
  const role = useDB(d => d.session?.role);
  const versions = useMemo(() => all.filter(v => v.passportId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [all, p.id]);
  const toast = useToast();
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>(CURRENT);
  const [saveOpen, setSaveOpen] = useState(false);
  const [note, setNote] = useState('');
  const canEdit = role !== 'viewer' && p.status !== 'trashed';

  const dataOf = (id: string) => id === CURRENT ? p.data : versions.find(v => v.id === id)?.data;
  const left = a || versions[0]?.id || '';
  const diff = useMemo(() => {
    const da = dataOf(left), db = dataOf(b);
    return da && db && left !== b ? diffData(da, db) : [];
  }, [left, b, versions, p.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = (id: string) => id === CURRENT ? `Curent (v${p.version})` : (() => { const v = versions.find(x => x.id === id); return v ? `v${v.version} · ${KIND[v.kind][1]} · ${fmtDateTime(v.createdAt)}` : '—'; })();

  return (
    <div className="stack lg">
      <div className="card flush">
        <div className="row between" style={{ padding: '14px 18px' }}>
          <h2>Istoric versiuni</h2>
          {canEdit && <button className="btn sm" onClick={() => setSaveOpen(true)}><Icon name="plus" />Salvează versiunea curentă</button>}
        </div>
        {versions.length === 0 ? <Empty icon="history" title="Nicio versiune încă">La fiecare publicare se salvează automat o versiune cu amprentă SHA-256.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th className="shrink">Versiune</th><th>Tip</th><th>Notă</th><th>Autor</th><th>Data</th><th>Amprentă</th><th className="shrink" /></tr></thead>
            <tbody>{versions.map(v => (
              <tr key={v.id}>
                <td className="num"><b>v{v.version}</b>{v.version === p.publishedVersion && v.kind === 'publish' && <span className="badge ok" style={{ marginLeft: 6 }}>live</span>}</td>
                <td><span className={'badge ' + KIND[v.kind][0]}>{KIND[v.kind][1]}</span></td>
                <td className="muted">{v.note || '—'}</td>
                <td className="small">{v.createdBy}</td>
                <td className="small muted nowrap">{fmtDateTime(v.createdAt)}</td>
                <td><button className="linkbtn mono" title={v.hash} style={{ fontSize: 11.5, color: 'var(--ink-2)' }} onClick={async () => toast((await copyText(v.hash)) ? 'Amprentă copiată' : v.hash)}>{v.hash.slice(0, 12)}…</button></td>
                <td className="shrink"><div className="row nowrap-row">
                  <button className="btn sm" onClick={() => { setA(v.id); setB(CURRENT); }}>Compară</button>
                  {canEdit && <ConfirmButton className="btn sm" confirmText="Confirmă" onConfirm={async () => { await pa.restoreVersion(v.id); toast(`Restaurat din v${v.version}`); }}>Restaurează</ConfirmButton>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {versions.length > 0 && (
        <div className="card stack">
          <div className="row between">
            <h2>Diferențe</h2>
            <div className="row">
              <select className="select" style={{ width: 'auto' }} value={left} onChange={e => setA(e.target.value)} aria-label="Versiunea veche">
                {versions.map(v => <option key={v.id} value={v.id}>{name(v.id)}</option>)}
              </select>
              <Icon name="arrowRight" size={16} />
              <select className="select" style={{ width: 'auto' }} value={b} onChange={e => setB(e.target.value)} aria-label="Versiunea nouă">
                <option value={CURRENT}>{name(CURRENT)}</option>
                {versions.map(v => <option key={v.id} value={v.id}>{name(v.id)}</option>)}
              </select>
            </div>
          </div>
          {diff.length === 0 ? <p className="muted">Nicio diferență.</p> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Câmp</th><th>Înainte</th><th>După</th></tr></thead>
              <tbody>{diff.map(d => (
                <tr key={d.field}>
                  <td>{FIELD[d.field]?.label_ro ?? d.field}</td>
                  <td className="diff-before small">{d.before === undefined ? '—' : formatByName(d.field, d.before, dataOf(left))}</td>
                  <td className="diff-after small">{d.after === undefined ? '—' : formatByName(d.field, d.after, dataOf(b))}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {saveOpen && (
        <Modal title="Salvează versiunea curentă" onClose={() => setSaveOpen(false)}
          footer={<><button className="btn" onClick={() => setSaveOpen(false)}>Anulează</button><button className="btn primary" onClick={async () => { await pa.saveVersion(p.id, note.trim()); setSaveOpen(false); setNote(''); toast('Versiune salvată'); }}>Salvează</button></>}>
          <div className="field"><label htmlFor="v-note">Notă</label><input id="v-note" className="input" autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="ex. înainte de schimbarea furnizorului de celule" /></div>
        </Modal>
      )}
    </div>
  );
}
