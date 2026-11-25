import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../api/store';
import { completeness } from '../lib/validation';
import { DEADLINES } from '../data/catalog';
import { daysUntil, fmtRelative } from '../lib/format';
import { Icon, Progress } from '../components/ui';
import { Sparkline, dailySeries } from './_charts';
import '../styles/org.css';

const DAY = 86_400_000;

export default function Dashboard() {
  const session = useDB(d => d.session);
  const o = useDB(d => d.org);
  const passports = useDB(d => d.passports);
  const units = useDB(d => d.units);
  const scans = useDB(d => d.scans);
  const requests = useDB(d => d.accessRequests);
  const alerts = useDB(d => d.alerts);
  const audit = useDB(d => d.audit);
  const members = useDB(d => d.members);
  const invites = useDB(d => d.invites);
  const webhooks = useDB(d => d.webhooks);
  const keys = useDB(d => d.apiKeys);

  const live = passports.filter(p => p.status !== 'trashed');
  const published = live.filter(p => p.status === 'published');
  const drafts = live.filter(p => p.status === 'draft');
  const now = Date.now();
  const last30 = scans.filter(s => now - new Date(s.at).getTime() < 30 * DAY).length;
  const prev30 = scans.filter(s => { const a = now - new Date(s.at).getTime(); return a >= 30 * DAY && a < 60 * DAY; }).length;
  const delta = prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : null;
  const pending = requests.filter(r => r.status === 'pending');
  const openAlerts = alerts.filter(a => !a.acknowledged);
  const series = useMemo(() => dailySeries(scans.map(s => s.at), 30), [scans]);

  const comp = useMemo(() => live.map(p => ({ p, now: completeness(p, false), all: completeness(p, true) })), [passports]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = comp.filter(c => c.p.profile === 'battery_full');
  const readiness = full.length ? Math.round(full.reduce((a, c) => a + c.all.pct, 0) / full.length) : 100;
  const d2027 = daysUntil(DEADLINES[0]!.date);

  const mfDone = ['manufacturer_name', 'manufacturer_address', 'manufacturer_country'].every(k => o.manufacturer?.[k]);
  const checklist = [
    { done: mfDone, label: 'Date producător', to: '/setari/producator' },
    { done: published.length > 0, label: 'Primul pașaport publicat', to: '/pasapoarte' },
    { done: !!o.resolver && o.customDomain.status !== 'error', label: 'Domeniu pentru QR', to: '/setari/domeniu' },
    { done: members.length + invites.length > 1, label: 'Echipă invitată', to: '/setari/echipa' },
    { done: webhooks.length > 0 || keys.some(k => !k.revokedAt), label: 'API sau webhook conectat', to: '/integrari' },
  ];
  const doneCount = checklist.filter(c => c.done).length;

  type Att = { key: string; icon: string; tone: string; title: string; sub: string; to: string };
  const attention: Att[] = [
    ...pending.map(r => ({ key: r.id, icon: 'lock', tone: 'acc', title: r.organization, sub: 'Cere acces la date', to: '/acces' })),
    ...openAlerts.slice(0, 3).map(a => ({ key: a.id, icon: 'alert', tone: 'bad', title: a.message, sub: 'Alertă BMS', to: '/telemetrie' })),
    ...comp.filter(c => c.p.status === 'draft' && !c.now.canPublish).map(c => ({ key: c.p.id, icon: 'edit', tone: 'warn', title: c.p.name, sub: `Ciornă · ${c.now.pct}% complet`, to: `/pasapoarte/${c.p.id}` })),
    ...comp.filter(c => c.p.status === 'published' && c.all.later.length > 0).map(c => ({ key: c.p.id + 'l', icon: 'calendar', tone: 'warn', title: c.p.name, sub: `${c.all.later.length} câmpuri obligatorii din 2027`, to: `/pasapoarte/${c.p.id}` })),
  ];

  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Bună dimineața' : hour < 18 ? 'Bună ziua' : 'Bună seara';

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles"><h1>{hello}, {session?.name.split(' ')[0]}</h1><p className="sub">{o.name}</p></div>
        <div className="row"><Link className="btn" to="/import"><Icon name="import" />Import</Link><Link className="btn primary" to="/pasapoarte/nou"><Icon name="plus" />Pașaport nou</Link></div>
      </div>

      <div className="kpis">
        <Link className="kpi" to="/pasapoarte"><span className="l"><Icon name="passport" />Pașapoarte publicate</span><span className="v">{published.length}</span><span className="d">{drafts.length} ciorne</span></Link>
        <Link className="kpi" to="/baterii"><span className="l"><Icon name="battery" />Baterii înregistrate</span><span className="v">{units.length.toLocaleString('ro-RO')}</span><span className="d">{units.filter(u => u.status !== 'original').length} în a doua viață sau deșeu</span></Link>
        <Link className="kpi" to="/statistici"><span className="l"><Icon name="qr" />Scanări 30 zile</span><span className="v">{last30.toLocaleString('ro-RO')}</span>
          <span className={'d' + (delta === null ? '' : delta >= 0 ? ' up' : ' down')}>{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta}% față de luna anterioară`}</span></Link>
        <Link className="kpi" to="/acces"><span className="l"><Icon name="lock" />Cereri de acces</span><span className="v">{pending.length}</span><span className="d">în așteptare</span></Link>
        <Link className="kpi" to="/telemetrie"><span className="l"><Icon name="pulse" />Alerte deschise</span><span className="v" style={openAlerts.length ? { color: 'var(--bad)' } : undefined}>{openAlerts.length}</span><span className="d">din telemetria BMS</span></Link>
      </div>

      <div className="dash-grid">
        <div className="stack lg">
          <section className="card">
            <div className="card-head"><h2>Necesită atenție</h2><span className="badge">{attention.length}</span></div>
            {attention.length === 0
              ? <p className="muted">Totul e în regulă.</p>
              : <div className="list">{attention.slice(0, 8).map(a => (
                  <Link key={a.key} to={a.to}><span className={'ic ' + a.tone}><Icon name={a.icon} /></span><span className="grow" style={{ minWidth: 0 }}><span className="t ellipsis" style={{ display: 'block' }}>{a.title}</span><span className="small muted">{a.sub}</span></span><Icon name="chevronRight" size={16} /></Link>))}
                </div>}
          </section>

          <section className="card">
            <div className="card-head"><h2>Scanări</h2><Link className="small" to="/statistici">Detalii</Link></div>
            <Sparkline data={series} height={64} />
          </section>

          <section className="card">
            <div className="card-head"><h2>Activitate recentă</h2><Link className="small" to="/activitate">Tot jurnalul</Link></div>
            <div className="list">
              {audit.slice(0, 8).map(e => (
                <div className="li" key={e.id}>
                  <span className="ic"><Icon name={e.type.startsWith('unit') ? 'battery' : e.type.startsWith('access') ? 'lock' : e.type.startsWith('import') ? 'import' : 'passport'} /></span>
                  <span className="grow" style={{ minWidth: 0 }}>{e.passportId ? <Link to={`/pasapoarte/${e.passportId}`} className="ellipsis" style={{ display: 'block', color: 'var(--ink)' }}>{e.summary}</Link> : <span className="ellipsis" style={{ display: 'block' }}>{e.summary}</span>}<span className="small muted">{e.actor}</span></span>
                  <span className="small faint nowrap">{fmtRelative(e.at)}</span>
                </div>))}
              {audit.length === 0 && <p className="muted">Încă nimic.</p>}
            </div>
          </section>
        </div>

        <div className="stack lg">
          <section className="countdown">
            <span className="small" style={{ opacity: .8 }}>Până la 18.02.2027</span>
            <span className="big">{d2027 > 0 ? d2027 : 0} <span style={{ fontSize: 16, fontWeight: 500 }}>zile</span></span>
            <Progress value={readiness} />
            <span className="small">Pregătire pașapoarte complete: <b style={{ color: '#fff' }}>{readiness}%</b></span>
            <Link to="/termene" className="small" style={{ color: 'var(--nav-active)' }}>Vezi termenele</Link>
          </section>

          {doneCount < checklist.length && (
            <section className="card">
              <div className="card-head"><h2>Configurare</h2><span className="small muted">{doneCount}/{checklist.length}</span></div>
              <Progress value={(doneCount / checklist.length) * 100} tone={doneCount === checklist.length ? 'ok' : undefined} />
              <div style={{ marginTop: 10 }}>
                {checklist.map(c => (
                  <Link key={c.label} to={c.to} className={'check-item' + (c.done ? ' done' : '')}><span className="box">{c.done && <Icon name="check" />}</span><span className="t">{c.label}</span></Link>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-head"><h2>Pregătire pe pașaport</h2></div>
            <div className="stack">
              {comp.filter(c => c.p.profile === 'battery_full').slice(0, 6).map(c => (
                <Link key={c.p.id} to={`/pasapoarte/${c.p.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="stack sm">
                  <span className="row between nowrap-row"><span className="ellipsis">{c.p.name}</span><span className="small num muted">{c.all.pct}%</span></span>
                  <Progress value={c.all.pct} tone={c.all.pct === 100 ? 'ok' : undefined} />
                </Link>
              ))}
              {full.length === 0 && <p className="muted small">Niciun pașaport complet încă.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
