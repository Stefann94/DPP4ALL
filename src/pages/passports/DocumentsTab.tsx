import { useMemo, useState } from 'react';
import { usePassportCtx } from './_ctx';
import { useDB } from '../../api/store';
import { documents as docs } from '../../api/actions';
import { fmtBytes, fmtDate } from '../../lib/format';
import { readAsArrayBuffer, readAsDataUrl, sha256 } from '../../lib/download';
import { Callout, Empty, FileDrop, Icon, Modal, MoreMenu, TierBadge, useToast } from '../../components/ui';
import { TIER_LABEL } from '../../data/catalog';
import type { AccessTier, DocumentFile } from '../../types';
import '../../styles/passports.css';

export const DOC_TYPE_LABEL: Record<DocumentFile['type'], string> = {
  conformity_declaration: 'Declarație de conformitate', test_report: 'Raport de testare', certification: 'Certificare',
  carbon_footprint_study: 'Studiu amprentă carbon', due_diligence_report: 'Raport due diligence', manual: 'Manual',
  safety_data_sheet: 'Fișă cu date de securitate', datasheet: 'Fișă tehnică', image: 'Imagine', document: 'Alt document',
};
const DEFAULT_TIER: Partial<Record<DocumentFile['type'], AccessTier>> = { test_report: 'authority', manual: 'restricted', datasheet: 'restricted' };
const MAX_INLINE = 1.5 * 1024 * 1024;

/** URL fields that are normally satisfied by a document of a given type. */
const NEEDS: { field: string; section: string; type: DocumentFile['type']; label: string }[] = [
  { field: 'eu_declaration_of_conformity_url', section: 'etichete_conformitate', type: 'conformity_declaration', label: 'Declarația UE de conformitate' },
  { field: 'test_reports_url', section: 'etichete_conformitate', type: 'test_report', label: 'Rapoarte de testare' },
  { field: 'carbon_footprint_study_url', section: 'amprenta_carbon', type: 'carbon_footprint_study', label: 'Studiul amprentei de carbon' },
  { field: 'dismantling_manuals_url', section: 'circularitate', type: 'manual', label: 'Manualul de demontare' },
];

export default function DocumentsTab() {
  const { passport: p } = usePassportCtx();
  const all = useDB(d => d.documents);
  const role = useDB(d => d.session?.role);
  const toast = useToast();
  const linked = useMemo(() => all.filter(d => d.passportIds.includes(p.id)), [all, p.id]);
  const others = useMemo(() => all.filter(d => !d.passportIds.includes(p.id)), [all, p.id]);
  const [pending, setPending] = useState<File | null>(null);
  const [type, setType] = useState<DocumentFile['type']>('document');
  const [tier, setTier] = useState<AccessTier>('public');
  const [libOpen, setLibOpen] = useState(false);
  const canEdit = role !== 'viewer' && p.status !== 'trashed';

  const missing = NEEDS.filter(n => {
    const fieldUsed = p.data[n.section]?.[n.field] !== undefined;
    return !linked.some(d => d.type === n.type) && (fieldUsed || n.type === 'conformity_declaration');
  });

  const upload = async () => {
    if (!pending) return;
    const buf = await readAsArrayBuffer(pending);
    const hash = await sha256(buf);
    const dataUrl = pending.size <= MAX_INLINE ? await readAsDataUrl(pending) : undefined;
    docs.add({ name: pending.name, type, accessTier: tier, mime: pending.type || 'application/octet-stream', size: pending.size, dataUrl, sha256: hash, passportIds: [p.id] });
    toast(dataUrl ? 'Document încărcat' : 'Document înregistrat (fișier prea mare pentru stocarea locală)');
    setPending(null);
  };

  return (
    <div className="stack lg">
      {missing.length > 0 && <Callout kind="warn">Lipsesc documente pentru: {missing.map(m => m.label).join(', ')}.</Callout>}

      <div className="card flush">
        <div className="row between" style={{ padding: '14px 18px' }}>
          <h2>Documente</h2>
          {canEdit && others.length > 0 && <button className="btn sm" onClick={() => setLibOpen(true)}><Icon name="link" />Din bibliotecă</button>}
        </div>
        {linked.length === 0 ? <Empty icon="doc" title="Niciun document">Declarații, rapoarte, manuale. Fiecare are nivel de acces propriu.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Nume</th><th>Tip</th><th>Acces</th><th className="shrink">Mărime</th><th className="shrink">Încărcat</th><th className="shrink" /></tr></thead>
            <tbody>{linked.map(d => (
              <tr key={d.id}>
                <td><span className="row nowrap-row"><Icon name="doc" size={15} /><span className="ellipsis" style={{ maxWidth: 320 }}>{d.name}</span></span></td>
                <td className="small muted">{DOC_TYPE_LABEL[d.type]}</td>
                <td><TierBadge tier={d.accessTier} /></td>
                <td className="small num muted">{fmtBytes(d.size)}</td>
                <td className="small muted nowrap">{fmtDate(d.uploadedAt)}</td>
                <td className="shrink">
                  <MoreMenu>
                    {d.dataUrl && <a href={d.dataUrl} download={d.name}><Icon name="download" />Descarcă</a>}
                    {d.dataUrl && <a href={d.dataUrl} target="_blank" rel="noopener"><Icon name="eye" />Deschide</a>}
                    {canEdit && (['public', 'restricted', 'authority'] as AccessTier[]).filter(t => t !== d.accessTier).map(t => <button key={t} onClick={() => docs.update(d.id, { accessTier: t })}><Icon name="lock" />Acces: {TIER_LABEL[t]}</button>)}
                    {canEdit && <><hr /><button className="danger" onClick={() => { docs.unlink(d.id, p.id); toast('Document detașat'); }}><Icon name="x" />Detașează</button></>}
                  </MoreMenu>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {canEdit && (
        <div className="card stack">
          <h2>Încarcă</h2>
          {!pending ? <FileDrop accept=".pdf,.png,.jpg,.jpeg,.webp" onFiles={f => { const x = f[0]; if (x) { setPending(x); const t: DocumentFile['type'] = /image\//.test(x.type) ? 'image' : /conform|DoC/i.test(x.name) ? 'conformity_declaration' : /test|report|raport|IEC/i.test(x.name) ? 'test_report' : /manual/i.test(x.name) ? 'manual' : /SDS|MSDS|securitate/i.test(x.name) ? 'safety_data_sheet' : /datasheet|fi[sș][aă]/i.test(x.name) ? 'datasheet' : 'document'; setType(t); setTier(DEFAULT_TIER[t] ?? 'public'); } }} />
            : (
              <div className="stack">
                <div className="row"><Icon name="doc" /><b className="ellipsis grow">{pending.name}</b><span className="small muted">{fmtBytes(pending.size)}</span></div>
                <div className="form-grid">
                  <div className="field"><label htmlFor="d-type">Tip</label>
                    <select id="d-type" className="select" value={type} onChange={e => { const t = e.target.value as DocumentFile['type']; setType(t); setTier(DEFAULT_TIER[t] ?? 'public'); }}>
                      {Object.entries(DOC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select></div>
                  <div className="field"><label htmlFor="d-tier">Cine îl vede</label>
                    <select id="d-tier" className="select" value={tier} onChange={e => setTier(e.target.value as AccessTier)}>
                      {Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select></div>
                </div>
                <div className="row end"><button className="btn" onClick={() => setPending(null)}>Anulează</button><button className="btn primary" onClick={upload}>Încarcă</button></div>
              </div>
            )}
        </div>
      )}

      {libOpen && (
        <Modal title="Adaugă din bibliotecă" onClose={() => setLibOpen(false)} wide>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Nume</th><th>Tip</th><th>Acces</th><th className="shrink" /></tr></thead>
            <tbody>{others.map(d => (
              <tr key={d.id}>
                <td className="ellipsis" style={{ maxWidth: 300 }}>{d.name}</td>
                <td className="small muted">{DOC_TYPE_LABEL[d.type]}</td>
                <td><TierBadge tier={d.accessTier} /></td>
                <td className="shrink"><button className="btn sm" onClick={() => { docs.link(d.id, p.id); toast('Document atașat'); }}>Atașează</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Modal>
      )}
    </div>
  );
}
