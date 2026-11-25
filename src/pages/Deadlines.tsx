import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../api/store';
import { org as orgActions } from '../api/actions';
import { DEADLINES, categoryLabel } from '../data/catalog';
import { completeness } from '../lib/validation';
import { daysUntil, fmtDate } from '../lib/format';
import { Empty, PageHead, Progress, StatusBadge, Switch } from '../components/ui';
import '../styles/org.css';

export default function Deadlines() {
  const o = useDB(d => d.org);
  const passports = useDB(d => d.passports);
  const rows = useMemo(() => passports.filter(p => p.status !== 'trashed' && p.profile === 'battery_full')
    .map(p => ({ p, now: completeness(p, false), all: completeness(p, true) }))
    .sort((a, b) => a.all.pct - b.all.pct), [passports]);

  return (
    <div className="page">
      <PageHead title="Termene" sub="Ce devine obligatoriu și când, după Reg. (UE) 2023/1542."
        actions={<Switch checked={o.notifications.deadlines} onChange={v => orgActions.update({ notifications: { ...o.notifications, deadlines: v } })} label="Notifică-mă" />} />

      <div className="dash-grid">
        <section className="card">
          <div className="dl-timeline">
            {DEADLINES.map(d => {
              const n = daysUntil(d.date);
              return (
                <div key={d.date} className={'dl-item' + (n < 0 ? ' past' : '')}>
                  <div className="date">{fmtDate(d.date)}<span>{n < 0 ? 'în vigoare' : n === 0 ? 'azi' : `în ${n} zile`}</span></div>
                  <div className="pt" />
                  <div className="stack sm"><h3>{d.title}</h3><p className="muted small">{d.detail}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Pregătire pentru 18.02.2027</h2></div>
          {rows.length === 0 ? <Empty icon="passport" title="Niciun pașaport complet" /> : (
            <div className="stack">
              {rows.map(({ p, now, all }) => (
                <Link key={p.id} to={`/pasapoarte/${p.id}`} className="stack sm" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="row between nowrap-row"><span className="ellipsis"><b>{p.name}</b></span><StatusBadge status={p.status} /></span>
                  <Progress value={all.pct} tone={all.pct === 100 ? 'ok' : undefined} />
                  <span className="small muted">{categoryLabel(p.category)} · azi {now.pct}% · cu 2027 {all.pct}%{all.later.length ? ` · ${all.later.length} câmpuri de completat până la termen` : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
