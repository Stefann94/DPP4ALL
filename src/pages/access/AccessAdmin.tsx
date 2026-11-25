import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../../api/store';
import { access } from '../../api/actions';
import { ConfirmButton, CopyButton, Empty, Icon, Modal, PageHead, Tabs, TierBadge, useToast } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtRelative, daysUntil } from '../../lib/format';
import { downloadCsv } from '../../lib/download';
import { KIND_LABEL, accessLink, approveAccess, toCsv } from '../_org';
import type { AccessRequest, AccessTier } from '../../types';
import '../../styles/org.css';

type Tab = 'pending' | 'approved' | 'closed' | 'log';

export default function AccessAdmin() {
  const requests = useDB(d => d.accessRequests);
  const log = useDB(d => d.accessLog);
  const passports = useDB(d => d.passports);
  const [tab, setTab] = useState<Tab>('pending');
  const [approving, setApproving] = useState<AccessRequest | null>(null);
  const toast = useToast();
  const now = new Date().toISOString();
  const isExpired = (r: AccessRequest) => r.status === 'approved' && !!r.expiresAt && r.expiresAt < now;
  const groups = useMemo(() => ({
    pending: requests.filter(r => r.status === 'pending'),
    approved: requests.filter(r => r.status === 'approved' && !isExpired(r)),
    closed: requests.filter(r => ['rejected', 'revoked', 'expired'].includes(r.status) || isExpired(r)),
  }), [requests]); // eslint-disable-line react-hooks/exhaustive-deps
  const pName = (id: string) => passports.find(p => p.id === id)?.name ?? id;
  const formUrl = `${location.origin}/cerere-acces`;

  const scope = (r: AccessRequest) => r.scope === 'all'
    ? <span className="badge">Toate pașapoartele</span>
    : <span className="chips">{r.passportIds.map(id => <span key={id} className="badge accent">{pName(id)}</span>)}</span>;

  const rows = tab === 'log' ? [] : groups[tab];

  return (
    <div className="page">
      <PageHead title="Acces date" sub="Reciclatori, service, operatori second-life și autorități."
        actions={<><CopyButton text={formUrl} label="Link formular public" /><a className="btn" href="/cerere-acces" target="_blank" rel="noreferrer"><Icon name="external" />Deschide formularul</a></>} />

      <Tabs value={tab} onChange={setTab} items={[
        { value: 'pending', label: 'În așteptare', count: groups.pending.length },
        { value: 'approved', label: 'Aprobate', count: groups.approved.length },
        { value: 'closed', label: 'Respinse și expirate', count: groups.closed.length },
        { value: 'log', label: 'Jurnal acces', count: log.length },
      ]} />

      {tab !== 'log' && (rows.length === 0
        ? <div className="card"><Empty icon="lock" title={tab === 'pending' ? 'Nicio cerere nouă' : 'Nimic aici'}>{tab === 'pending' ? 'Trimite linkul formularului celor care au nevoie de date restricționate.' : null}</Empty></div>
        : <div className="stack">
          {rows.map(r => {
            const link = r.status === 'approved' ? accessLink(r) : '';
            const exp = r.expiresAt ? daysUntil(r.expiresAt) : null;
            return (
              <article key={r.id} className="card">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="stack sm" style={{ minWidth: 0, flex: '1 1 320px' }}>
                    <div className="row"><h3>{r.organization}</h3><span className="badge">{KIND_LABEL[r.kind]}</span><TierBadge tier={r.tierRequested} />
                      {r.status === 'rejected' && <span className="badge bad">Respinsă</span>}{r.status === 'revoked' && <span className="badge bad">Revocată</span>}{isExpired(r) && <span className="badge">Expirată</span>}</div>
                    <span className="small muted">{r.contactName} · <a href={`mailto:${r.email}`}>{r.email}</a> · {fmtRelative(r.createdAt)}</span>
                    <p style={{ maxWidth: '70ch' }}>{r.reason}</p>
                    <div>{scope(r)}</div>
                  </div>
                  <div className="row">
                    {r.status === 'pending' && <>
                      <ConfirmButton onConfirm={() => { access.reject(r.id); toast('Cerere respinsă'); }} confirmText="Confirmă respingerea">Respinge</ConfirmButton>
                      <button className="btn primary" onClick={() => setApproving(r)}><Icon name="check" />Aprobă</button>
                    </>}
                    {r.status === 'approved' && !isExpired(r) && <ConfirmButton onConfirm={() => { access.revoke(r.id); toast('Acces revocat'); }} confirmText="Confirmă revocarea">Revocă</ConfirmButton>}
                  </div>
                </div>
                {r.status === 'approved' && !isExpired(r) && (
                  <div className="callout ok" style={{ marginTop: 12 }}>
                    <Icon name="link" />
                    <div className="grow stack sm">
                      <span className="mono ellipsis" style={{ display: 'block' }}>{link || 'Niciun pașaport de partajat'}</span>
                      <span className="small muted">Expiră {fmtDate(r.expiresAt)}{exp !== null && exp >= 0 ? ` (în ${exp} zile)` : ''} · aprobat de {r.decidedBy}</span>
                    </div>
                    {link && <CopyButton text={link} label="Copiază linkul" />}
                  </div>
                )}
              </article>
            );
          })}
        </div>)}

      {tab === 'log' && (
        <div className="card flush">
          <div className="row between" style={{ padding: '12px 14px' }}>
            <span className="muted small">Fiecare consultare a datelor restricționate rămâne înregistrată.</span>
            <button className="btn sm" disabled={!log.length} onClick={() => downloadCsv(toCsv([['data', 'organizatie', 'pasaport', 'serie', 'campuri'], ...log.map(l => [l.at, l.organization, pName(l.passportId), l.unitSerial ?? '', l.fieldsViewed])]), 'jurnal-acces.csv')}><Icon name="download" />CSV</button>
          </div>
          {log.length === 0 ? <Empty icon="activity" title="Nicio consultare încă" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Când</th><th>Organizație</th><th>Pașaport</th><th>Baterie</th><th style={{ textAlign: 'right' }}>Câmpuri</th></tr></thead>
              <tbody>{log.map(l => (
                <tr key={l.id}><td className="nowrap">{fmtDateTime(l.at)}</td><td>{l.organization}</td><td><Link to={`/pasapoarte/${l.passportId}/acces`}>{pName(l.passportId)}</Link></td>
                  <td className="mono">{l.unitSerial ?? '—'}</td><td className="num" style={{ textAlign: 'right' }}>{l.fieldsViewed}</td></tr>))}
              </tbody></table></div>)}
        </div>
      )}

      {approving && <ApproveModal req={approving} onClose={() => setApproving(null)} onDone={() => { setApproving(null); toast('Acces aprobat'); }} />}
    </div>
  );
}

function ApproveModal({ req, onClose, onDone }: { req: AccessRequest; onClose: () => void; onDone: () => void }) {
  const all = useDB(d => d.passports);
  const passports = all.filter(p => p.status !== 'trashed');
  const [days, setDays] = useState(90);
  const [tier, setTier] = useState<Exclude<AccessTier, 'public'>>(req.tierRequested);
  const [limit, setLimit] = useState(req.scope === 'passport');
  const [ids, setIds] = useState<string[]>(req.passportIds);
  return (
    <Modal title={`Aprobă: ${req.organization}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Anulează</button><button className="btn primary" disabled={limit && !ids.length} onClick={() => { approveAccess(req.id, days, tier, limit ? ids : null); onDone(); }}>Aprobă accesul</button></>}>
      <div className="field"><span className="label">Durată</span>
        <div className="seg">{[30, 90, 180, 365].map(d => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d === 365 ? '1 an' : `${d} zile`}</button>)}</div></div>
      <div className="field"><span className="label">Nivel</span>
        <div className="seg"><button aria-pressed={tier === 'restricted'} onClick={() => setTier('restricted')}>Interes legitim</button><button aria-pressed={tier === 'authority'} onClick={() => setTier('authority')}>Autoritate</button></div>
        {tier === 'authority' && req.kind !== 'authority' && req.kind !== 'notified_body' && <span className="advice">Nivelul pentru autorități e pentru supravegherea pieței și organisme notificate.</span>}</div>
      <label className="check"><input type="checkbox" checked={limit} onChange={e => setLimit(e.target.checked)} />Doar anumite pașapoarte</label>
      {limit && <div className="chips">{passports.map(p => <label key={p.id} className="chip"><input type="checkbox" checked={ids.includes(p.id)} onChange={e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(x => x !== p.id))} />{p.name}</label>)}</div>}
      <p className="small muted">Se generează un link cu token, valabil {days} zile. Poți revoca oricând.</p>
    </Modal>
  );
}
