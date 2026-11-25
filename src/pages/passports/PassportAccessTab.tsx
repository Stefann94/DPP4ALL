import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDB } from '../../api/store';
import { FIELDS, TIER_LABEL, applies } from '../../data/catalog';
import { CopyButton, Empty, Icon, TierBadge } from '../../components/ui';
import { daysUntil, fmtDate, fmtDateTime } from '../../lib/format';
import { KIND_LABEL, accessLink } from '../_org';
import type { AccessTier } from '../../types';
import '../../styles/org.css';

export default function PassportAccessTab() {
  const { id = '' } = useParams();
  const p = useDB(d => d.passports.find(x => x.id === id));
  const requests = useDB(d => d.accessRequests);
  const log = useDB(d => d.accessLog);
  const grants = useMemo(() => requests.filter(r => r.status === 'approved' && (r.scope === 'all' || r.passportIds.includes(id))), [requests, id]);
  const pLog = useMemo(() => log.filter(l => l.passportId === id), [log, id]);
  const tiers = useMemo(() => {
    const c: Record<AccessTier, number> = { public: 0, restricted: 0, authority: 0 };
    for (const f of FIELDS) if (applies(f, p?.category)) c[f.access_tier]++;
    return c;
  }, [p?.category]);
  if (!p) return null;
  const now = new Date().toISOString();

  return (
    <div className="stack lg">
      <div className="grid-3">
        {(Object.keys(tiers) as AccessTier[]).map(t => (
          <div key={t} className="card tight stack sm"><TierBadge tier={t} /><span className="stat"><span className="v">{tiers[t]}</span><span className="l">câmpuri {TIER_LABEL[t].toLowerCase()}</span></span></div>
        ))}
      </div>

      <section className="card">
        <div className="card-head"><h3>Cine are acces</h3><div className="row"><CopyButton text={`${location.origin}/cerere-acces?passport=${id}`} label="Link cerere acces" /><Link className="btn sm" to="/acces">Gestionează</Link></div></div>
        {grants.length === 0 ? <Empty icon="lock" title="Doar date publice">Nimeni nu are acces la datele restricționate ale acestui pașaport.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Organizație</th><th>Tip</th><th>Nivel</th><th>Acoperire</th><th>Expiră</th><th className="shrink" /></tr></thead>
            <tbody>{grants.map(r => {
              const expired = !!r.expiresAt && r.expiresAt < now;
              const d = r.expiresAt ? daysUntil(r.expiresAt) : null;
              return <tr key={r.id}>
                <td><b>{r.organization}</b><div className="small muted">{r.contactName}</div></td>
                <td>{KIND_LABEL[r.kind]}</td><td><TierBadge tier={r.tierRequested} /></td>
                <td>{r.scope === 'all' ? 'Toate pașapoartele' : 'Doar acesta'}</td>
                <td>{expired ? <span className="badge">Expirat</span> : <span className={d !== null && d < 14 ? 'advice' : ''}>{fmtDate(r.expiresAt)}</span>}</td>
                <td>{!expired && r.token && <CopyButton text={accessLink(r, id)} label="Link" />}</td>
              </tr>;
            })}</tbody></table></div>)}
      </section>

      <section className="card">
        <div className="card-head"><h3>Jurnal consultări</h3><span className="badge">{pLog.length}</span></div>
        {pLog.length === 0 ? <p className="muted small">Nicio consultare înregistrată.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Când</th><th>Organizație</th><th>Baterie</th><th style={{ textAlign: 'right' }}>Câmpuri</th></tr></thead>
            <tbody>{pLog.map(l => <tr key={l.id}><td className="nowrap">{fmtDateTime(l.at)}</td><td>{l.organization}</td><td className="mono">{l.unitSerial ?? '—'}</td><td className="num" style={{ textAlign: 'right' }}>{l.fieldsViewed}</td></tr>)}</tbody>
          </table></div>)}
      </section>
      <p className="small faint"><Icon name="info" size={12} /> Datele pentru interes legitim: Anexa XIII punctele 2 și 4. Datele pentru autorități: punctul 3.</p>
    </div>
  );
}
