import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/data.css';
import { useDB } from '../../api/store';
import { documents as docActions } from '../../api/actions';
import { TIER_LABEL } from '../../data/catalog';
import { readAsArrayBuffer, readAsDataUrl, sha256 } from '../../lib/download';
import { fmtBytes, fmtDate } from '../../lib/format';
import { Callout, ConfirmButton, Drawer, Empty, FileDrop, Icon, Modal, PageHead, TierBadge, useToast } from '../../components/ui';
import type { AccessTier, DocumentFile } from '../../types';

export const DOC_TYPE_LABEL: Record<DocumentFile['type'], string> = {
  conformity_declaration: 'Declarație UE de conformitate', test_report: 'Raport de testare', certification: 'Certificat',
  carbon_footprint_study: 'Studiu amprentă de carbon', due_diligence_report: 'Raport due diligence', manual: 'Manual / demontare',
  safety_data_sheet: 'Fișă de securitate', datasheet: 'Fișă tehnică', image: 'Imagine', document: 'Alt document',
};
const MAX_INLINE = 1.5 * 1024 * 1024;

function guessType(name: string, mime: string): DocumentFile['type'] {
  const n = name.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (/conformit|doc[-_ ]?ue|declaration/.test(n)) return 'conformity_declaration';
  if (/test|iec|raport|report/.test(n)) return 'test_report';
  if (/carbon|pef|amprent/.test(n)) return 'carbon_footprint_study';
  if (/due[-_ ]?dilig/.test(n)) return 'due_diligence_report';
  if (/manual|demont|dismantl/.test(n)) return 'manual';
  if (/sds|msds|securitat/.test(n)) return 'safety_data_sheet';
  if (/datasheet|fisa|fișă|spec/.test(n)) return 'datasheet';
  if (/certif|iso/.test(n)) return 'certification';
  return 'document';
}
const defaultTier = (t: DocumentFile['type']): AccessTier => (t === 'test_report' ? 'authority' : ['manual', 'datasheet', 'safety_data_sheet'].includes(t) ? 'restricted' : 'public');

export default function Documents() {
  const toast = useToast();
  const docs = useDB(d => d.documents);
  const passports = useDB(d => d.passports);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [tier, setTier] = useState('');
  const [unlinked, setUnlinked] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState(0);
  const pName = (id: string) => passports.find(p => p.id === id)?.name ?? id;

  const list = useMemo(() => docs.filter(d =>
    (!q || d.name.toLowerCase().includes(q.toLowerCase())) && (!type || d.type === type) && (!tier || d.accessTier === tier) && (!unlinked || d.passportIds.length === 0)), [docs, q, type, tier, unlinked]);

  const upload = async (files: File[]) => {
    setBusy(files.length);
    let big = 0;
    for (const f of files) {
      try {
        const hash = await sha256(await readAsArrayBuffer(f));
        const inline = f.size <= MAX_INLINE;
        if (!inline) big++;
        const t = guessType(f.name, f.type);
        docActions.add({ name: f.name, type: t, accessTier: defaultTier(t), mime: f.type || 'application/octet-stream', size: f.size, dataUrl: inline ? await readAsDataUrl(f) : undefined, sha256: hash, passportIds: [] });
      } catch { toast(`${f.name} nu a putut fi citit.`, 'bad'); }
    }
    setBusy(0);
    toast(`${files.length} ${files.length === 1 ? 'document încărcat' : 'documente încărcate'}` + (big ? ` · ${big} doar ca metadate (> 1,5 MB)` : ''));
  };

  const edit = docs.find(d => d.id === editId) ?? null;
  const preview = docs.find(d => d.id === previewId) ?? null;

  return (
    <div className="page">
      <PageHead title="Documente" sub={`${docs.length} în bibliotecă · ${docs.filter(d => !d.passportIds.length).length} nelegate`} />
      <FileDrop multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.txt,.csv,.xlsx,.docx" onFiles={upload}>
        <b>{busy ? `Se încarcă ${busy}…` : 'Trage documentele aici'}</b><span className="small">PDF, imagini, foi de calcul · tipul și accesul se propun automat</span>
      </FileDrop>

      <div className="card flush">
        <div className="row" style={{ padding: '12px 14px', gap: 8 }}>
          <div className="input-affix" style={{ flex: '1 1 220px' }}><input className="input" placeholder="Caută după nume" value={q} onChange={e => setQ(e.target.value)} aria-label="Caută" /><span className="affix"><Icon name="search" size={14} /></span></div>
          <select className="select" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)} aria-label="Tip"><option value="">Toate tipurile</option>{Object.entries(DOC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="select" style={{ width: 'auto' }} value={tier} onChange={e => setTier(e.target.value)} aria-label="Acces"><option value="">Orice acces</option>{Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <label className="check small"><input type="checkbox" checked={unlinked} onChange={e => setUnlinked(e.target.checked)} />Nelegate</label>
        </div>
        {list.length === 0 ? <Empty icon="doc" title={docs.length ? 'Niciun document pentru filtrele alese' : 'Biblioteca e goală'} /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Document</th><th>Tip</th><th>Acces</th><th>Pașapoarte</th><th className="shrink">Mărime</th><th>Încărcat</th><th className="shrink" /></tr></thead>
            <tbody>{list.map(d => (
              <tr key={d.id} className="clickable" onClick={() => setEditId(d.id)}>
                <td><div className="row nowrap-row"><Icon name={d.mime.startsWith('image/') ? 'eye' : 'doc'} size={16} /><b className="ellipsis" style={{ maxWidth: 300 }}>{d.name}</b></div>
                  {d.sha256 && <span className="mono faint" title={d.sha256}>sha256 {d.sha256.slice(0, 12)}…</span>}</td>
                <td className="small">{DOC_TYPE_LABEL[d.type]}</td>
                <td><TierBadge tier={d.accessTier} /></td>
                <td><div className="pp-chips">{d.passportIds.length ? d.passportIds.map(id => <span key={id} className="pp-chip" title={pName(id)}>{pName(id)}</span>) : <span className="faint small">—</span>}</div></td>
                <td className="num nowrap small">{fmtBytes(d.size)}</td>
                <td className="small nowrap">{fmtDate(d.uploadedAt)}<div className="faint">{d.uploadedBy}</div></td>
                <td onClick={e => e.stopPropagation()}>{d.dataUrl && <button className="btn ghost icon" aria-label="Previzualizare" onClick={() => setPreviewId(d.id)}><Icon name="eye" /></button>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>

      {edit && <EditDrawer doc={edit} onClose={() => setEditId(null)} onPreview={() => setPreviewId(edit.id)} />}
      {preview?.dataUrl && (
        <Modal wide title={preview.name} onClose={() => setPreviewId(null)} footer={<a className="btn" href={preview.dataUrl} download={preview.name}><Icon name="download" />Descarcă</a>}>
          {preview.mime.startsWith('image/') ? <img src={preview.dataUrl} alt={preview.name} style={{ maxHeight: '70vh', margin: '0 auto', display: 'block' }} />
            : preview.mime === 'application/pdf' ? <iframe className="doc-preview" src={preview.dataUrl} title={preview.name} />
            : <Callout>Fișierul nu poate fi previzualizat aici. Descarcă-l.</Callout>}
        </Modal>
      )}
    </div>
  );
}

function EditDrawer({ doc, onClose, onPreview }: { doc: DocumentFile; onClose: () => void; onPreview: () => void }) {
  const passports = useDB(d => d.passports).filter(p => p.status !== 'trashed');
  const [name, setName] = useState(doc.name);
  return (
    <Drawer title="Document" onClose={onClose} footer={<>
      <ConfirmButton onConfirm={() => { docActions.remove(doc.id); onClose(); }} confirmText="Șterge definitiv"><Icon name="trash" />Șterge</ConfirmButton>
      <span className="grow" />
      <button className="btn primary" onClick={onClose}>Gata</button>
    </>}>
      <div className="field"><label htmlFor="d-name">Nume</label><input id="d-name" className="input" value={name} onChange={e => setName(e.target.value)} onBlur={() => name.trim() && name !== doc.name && docActions.update(doc.id, { name: name.trim() })} /></div>
      <div className="grid-2">
        <div className="field"><label htmlFor="d-type">Tip</label>
          <select id="d-type" className="select" value={doc.type} onChange={e => docActions.update(doc.id, { type: e.target.value as DocumentFile['type'] })}>{Object.entries(DOC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="d-tier">Cine îl vede</label>
          <select id="d-tier" className="select" value={doc.accessTier} onChange={e => docActions.update(doc.id, { accessTier: e.target.value as AccessTier })}>{Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <dl className="kv">
        <dt>Mărime</dt><dd>{fmtBytes(doc.size)} · {doc.mime}</dd>
        <dt>Încărcat</dt><dd>{fmtDate(doc.uploadedAt)} · {doc.uploadedBy}</dd>
        {doc.sha256 && <><dt>SHA-256</dt><dd className="mono" style={{ fontSize: 11 }}>{doc.sha256}</dd></>}
      </dl>
      {doc.dataUrl ? <button className="btn" onClick={onPreview}><Icon name="eye" />Previzualizare</button> : <Callout>Fișier mare: aici se păstrează doar metadatele până la backend.</Callout>}
      <div className="stack sm">
        <span className="section-title">Legat de pașapoarte</span>
        {passports.map(p => (
          <label key={p.id} className="check"><input type="checkbox" checked={doc.passportIds.includes(p.id)} onChange={e => (e.target.checked ? docActions.link(doc.id, p.id) : docActions.unlink(doc.id, p.id))} />
            <span className="ellipsis">{p.name}</span><Link to={`/pasapoarte/${p.id}/documente`} className="small" onClick={onClose}><Icon name="arrowRight" size={12} /></Link></label>))}
      </div>
    </Drawer>
  );
}
