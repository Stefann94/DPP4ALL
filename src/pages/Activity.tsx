import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../api/store';
import { Empty, Icon, PageHead } from '../components/ui';
import { fmtDateTime } from '../lib/format';
import { downloadCsv } from '../lib/download';
import { AUDIT_GROUPS, auditGroupOf, toCsv } from './_org';
import '../styles/org.css';

const PAGE = 50;

export default function Activity() {
  const audit = useDB(d => d.audit);
  const passports = useDB(d => d.passports);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [actor, setActor] = useState('');
  const [pid, setPid] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const actors = useMemo(() => [...new Set(audit.map(a => a.actor))].sort(), [audit]);
  const pName = (id?: string) => passports.find(p => p.id === id)?.name;

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const g = AUDIT_GROUPS.find(x => x.id === group);
    return audit.filter(a =>
      (!g || g.match(a.type)) && (!actor || a.actor === actor) && (!pid || a.passportId === pid) &&
      (!from || a.at.slice(0, 10) >= from) && (!to || a.at.slice(0, 10) <= to) &&
      (!s || (a.summary + ' ' + a.actor + ' ' + a.type).toLowerCase().includes(s)));
  }, [audit, q, group, actor, pid, from, to]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const reset = (fn: () => void) => { fn(); setPage(0); };

  return (
    <div className="page">
      <PageHead title="Activitate" sub="Jurnalul complet al modificărilor, cine și când."
        actions={<button className="btn" disabled={!rows.length} onClick={() => downloadCsv(toCsv([['data', 'utilizator', 'categorie', 'tip', 'descriere', 'pasaport'], ...rows.map(a => [a.at, a.actor, auditGroupOf(a.type), a.type, a.summary, pName(a.passportId) ?? ''])]), 'activitate.csv')}><Icon name="download" />CSV</button>} />

      <div className="row">
        <input className="input" style={{ maxWidth: 260 }} placeholder="Caută…" aria-label="Caută" value={q} onChange={e => reset(() => setQ(e.target.value))} />
        <select className="select" style={{ width: 'auto' }} aria-label="Categorie" value={group} onChange={e => reset(() => setGroup(e.target.value))}><option value="">Toate categoriile</option>{AUDIT_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
        <select className="select" style={{ width: 'auto' }} aria-label="Utilizator" value={actor} onChange={e => reset(() => setActor(e.target.value))}><option value="">Toți utilizatorii</option>{actors.map(a => <option key={a}>{a}</option>)}</select>
        <select className="select" style={{ width: 'auto', maxWidth: 220 }} aria-label="Pașaport" value={pid} onChange={e => reset(() => setPid(e.target.value))}><option value="">Toate pașapoartele</option>{passports.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input className="input" style={{ width: 'auto' }} type="date" aria-label="De la" value={from} onChange={e => reset(() => setFrom(e.target.value))} />
        <input className="input" style={{ width: 'auto' }} type="date" aria-label="Până la" value={to} onChange={e => reset(() => setTo(e.target.value))} />
      </div>

      <div className="card flush">
        {view.length === 0 ? <Empty icon="activity" title="Nicio înregistrare" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Când</th><th>Cine</th><th>Categorie</th><th>Ce</th><th>Pașaport</th></tr></thead>
            <tbody>{view.map(a => (
              <tr key={a.id}>
                <td className="nowrap small">{fmtDateTime(a.at)}</td>
                <td className="nowrap">{a.actor}</td>
                <td><span className="badge">{auditGroupOf(a.type)}</span></td>
                <td>{a.summary}<div className="mono faint" style={{ fontSize: 11 }}>{a.type}</div></td>
                <td>{a.passportId && pName(a.passportId) ? <Link to={`/pasapoarte/${a.passportId}`}>{pName(a.passportId)}</Link> : <span className="faint">—</span>}</td>
              </tr>))}
            </tbody></table></div>)}
      </div>
      {pages > 1 && (
        <div className="row between">
          <span className="small muted">{rows.length.toLocaleString('ro-RO')} înregistrări</span>
          <div className="row"><button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="chevronLeft" />Înapoi</button><span className="small num">{page + 1} / {pages}</span><button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Înainte<Icon name="chevronRight" /></button></div>
        </div>
      )}
    </div>
  );
}
