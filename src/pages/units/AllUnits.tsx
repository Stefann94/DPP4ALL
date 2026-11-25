import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/units.css';
import { useDB } from '../../api/store';
import { fmtMonth, fmtRelative } from '../../lib/format';
import { Empty, Icon, PageHead, UNIT_STATUS_LABEL, UnitStatusBadge } from '../../components/ui';
import { Bars, SohCell, StatusBar } from './_UnitWidgets';
import { SOH_BUCKETS, STATUS_ORDER, soh } from './_unitHelpers';
import type { UnitStatus } from '../../types';

const PAGE = 50;

export default function AllUnits() {
  const units = useDB(d => d.units);
  const passports = useDB(d => d.passports);
  const alerts = useDB(d => d.alerts);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [pid, setPid] = useState('');
  const [status, setStatus] = useState<UnitStatus | ''>('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [page, setPage] = useState(0);

  const byId = useMemo(() => new Map(passports.map(p => [p.id, p])), [passports]);
  const alertUnits = useMemo(() => new Set(alerts.filter(a => !a.acknowledged).map(a => a.unitId)), [alerts]);
  const withPassport = useMemo(() => units.filter(u => byId.get(u.passportId)?.status !== 'trashed'), [units, byId]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return withPassport.filter(u => (!s || u.serial.toLowerCase().includes(s)) && (!pid || u.passportId === pid) && (!status || u.status === status) && (!onlyAlerts || alertUnits.has(u.id)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [withPassport, q, pid, status, onlyAlerts, alertUnits]);
  useEffect(() => setPage(0), [q, pid, status, onlyAlerts]);

  const sohVals = rows.map(u => soh(u, byId.get(u.passportId))).filter((v): v is number => v !== null);
  const buckets = SOH_BUCKETS.map(b => ({ label: b.label, value: sohVals.filter(b.test).length }));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice(page * PAGE, page * PAGE + PAGE);
  const models = passports.filter(p => p.status !== 'trashed' && withPassport.some(u => u.passportId === p.id));

  return (
    <div className="page">
      <PageHead title="Baterii" sub={`${withPassport.length.toLocaleString('ro-RO')} baterii în ${models.length} modele`} />
      {withPassport.length === 0 ? (
        <div className="card"><Empty icon="battery" title="Nicio baterie" action={<Link className="btn primary" to="/pasapoarte">Deschide un pașaport</Link>}>Bateriile se adaugă din pașaportul modelului, tab-ul Baterii, sau prin import.</Empty></div>
      ) : <>
        <div className="grid-2">
          <div className="card stack"><span className="section-title">Status</span><StatusBar units={rows} /></div>
          <div className="card stack"><span className="section-title">Stare de sănătate (SoH)</span>{sohVals.length ? <Bars data={buckets} label="Număr de baterii pe intervale de SoH" /> : <span className="faint small">Fără date de capacitate.</span>}</div>
        </div>

        <div className="card flush">
          <div className="row" style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <input className="input" style={{ maxWidth: 240 }} placeholder="Caută serie" value={q} onChange={e => setQ(e.target.value)} aria-label="Caută serie" />
            <select className="select" style={{ width: 'auto', maxWidth: 260 }} value={pid} onChange={e => setPid(e.target.value)} aria-label="Model">
              <option value="">Toate modelele</option>{models.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value as UnitStatus | '')} aria-label="Status">
              <option value="">Toate statusurile</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{UNIT_STATUS_LABEL[s]}</option>)}
            </select>
            <label className={'chip' + (onlyAlerts ? ' on' : '')}><input type="checkbox" checked={onlyAlerts} onChange={e => setOnlyAlerts(e.target.checked)} />Cu alerte{alertUnits.size ? ` (${alertUnits.size})` : ''}</label>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Serie</th><th>Model</th><th>Status</th><th>SoH</th><th>Lot</th><th>Fabricată</th><th>Actualizată</th></tr></thead>
              <tbody>
                {visible.map(u => {
                  const p = byId.get(u.passportId);
                  return (
                    <tr key={u.id} className="clickable" onClick={() => nav(`/pasapoarte/${u.passportId}/baterii/${u.id}`)}>
                      <td className="mono nowrap">{alertUnits.has(u.id) && <Icon name="alert" size={13} className="" />} {u.serial}</td>
                      <td className="ellipsis" style={{ maxWidth: 240 }}><Link to={`/pasapoarte/${u.passportId}/baterii`} onClick={e => e.stopPropagation()}>{p?.name ?? '—'}</Link></td>
                      <td><UnitStatusBadge status={u.status} /></td>
                      <td><SohCell value={soh(u, p)} /></td>
                      <td className="mono muted">{u.batch ?? '—'}</td>
                      <td className="muted nowrap">{fmtMonth(u.manufacturingDate)}</td>
                      <td className="muted nowrap">{fmtRelative(u.updatedAt)}</td>
                    </tr>
                  );
                })}
                {!visible.length && <tr><td colSpan={7} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nicio baterie pentru filtrele alese.</td></tr>}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="u-pager">
              <span>{page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} din {rows.length}</span>
              <div className="row">
                <button className="btn sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="chevronLeft" />Înapoi</button>
                <button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Înainte<Icon name="chevronRight" /></button>
              </div>
            </div>
          )}
        </div>
      </>}
    </div>
  );
}
