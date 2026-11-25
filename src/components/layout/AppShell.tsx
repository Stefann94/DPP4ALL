import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useDB } from '../../api/store';
import { notifications as notifActions } from '../../api/actions';
import { Icon, Menu } from '../ui';
import { fmtRelative, initials } from '../../lib/format';
import { CommandPalette } from './CommandPalette';
import { Tour, tourDone } from './Tour';
import { LogoMark } from '../LogoMark';

type Counts = { passports: number; units: number; pendingAccess: number; openAlerts: number };
type Item = { to: string; label: string; desc: string; icon: string; count?: (c: Counts) => number | undefined };
type Entry = { kind: 'link'; item: Item } | { kind: 'group'; label: string; items: Item[] };

const NAV: Entry[] = [
  { kind: 'link', item: { to: '/panou', label: 'Panou', desc: '', icon: 'dashboard' } },
  { kind: 'link', item: { to: '/pasapoarte', label: 'Pașapoarte', desc: '', icon: 'passport' } },
  { kind: 'link', item: { to: '/baterii', label: 'Baterii', desc: '', icon: 'battery' } },
  { kind: 'group', label: 'Date', items: [
    { to: '/import', label: 'Import', desc: 'Excel, CSV, script automat', icon: 'import' },
    { to: '/export', label: 'Export și backup', desc: 'CSV, JSON, EN 18223, arhivă completă', icon: 'export' },
    { to: '/documente', label: 'Documente', desc: 'Declarații, rapoarte, fișe tehnice', icon: 'doc' },
    { to: '/etichete', label: 'Etichete și QR', desc: 'QR, EAN-14, coli de tipărit', icon: 'tag' },
  ] },
  { kind: 'group', label: 'Operare', items: [
    { to: '/telemetrie', label: 'Telemetrie BMS', desc: 'Valori din baterii și alerte', icon: 'pulse', count: c => c.openAlerts || undefined },
    { to: '/acces', label: 'Acces date', desc: 'Reciclatori, service, autorități', icon: 'lock', count: c => c.pendingAccess || undefined },
    { to: '/statistici', label: 'Statistici scanări', desc: 'Cine scanează, unde, când', icon: 'chart' },
    { to: '/integrari', label: 'Integrări și API', desc: 'Chei API, webhook-uri', icon: 'webhook' },
  ] },
  { kind: 'group', label: 'Conformitate', items: [
    { to: '/termene', label: 'Termene', desc: 'Ce devine obligatoriu și când', icon: 'calendar' },
    { to: '/activitate', label: 'Activitate', desc: 'Jurnal complet de modificări', icon: 'activity' },
  ] },
];

function useCounts(): Counts {
  const passports = useDB(d => d.passports);
  const units = useDB(d => d.units);
  const requests = useDB(d => d.accessRequests);
  const alerts = useDB(d => d.alerts);
  return useMemo(() => ({
    passports: passports.filter(p => p.status !== 'trashed').length,
    units: units.length,
    pendingAccess: requests.filter(r => r.status === 'pending').length,
    openAlerts: alerts.filter(a => !a.acknowledged).length,
  }), [passports, units, requests, alerts]);
}

function useTheme() {
  const [theme, setTheme] = useState<string>(() => { try { return localStorage.getItem('dpp-theme-v2') ?? 'light'; } catch { return 'light'; } });
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('dpp-theme-v2', theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme] as const;
}

function NavGroup({ label, items, counts, path }: { label: string; items: Item[]; counts: Counts; path: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => setOpen(false), [path]);
  const active = items.some(i => path.startsWith(i.to));
  const badge = items.reduce((n, i) => n + (i.count?.(counts) ?? 0), 0);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={'nav' + (active ? ' active' : '')} data-tour={'nav-' + label} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {label}{badge > 0 && <span className="cnt alert">{badge}</span>}<Icon name="chevronDown" />
      </button>
      {open && (
        <div className="mega" role="menu">
          {items.map(i => {
            const n = i.count?.(counts);
            return <NavLink key={i.to} to={i.to} role="menuitem" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ic"><Icon name={i.icon} /></span>
              <span><b>{i.label}</b><span className="d">{i.desc}</span></span>
              {n ? <span className="cnt">{n}</span> : <span />}
            </NavLink>;
          })}
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const session = useDB(d => d.session);
  const orgName = useDB(d => d.org.name);
  const plan = useDB(d => d.org.plan);
  const notifs = useDB(d => d.notifications);
  const counts = useCounts();
  const [mobile, setMobile] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [theme, setTheme] = useTheme();
  const [tour, setTour] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setMobile(false), [loc.pathname]);
  // first visit: start the quick tour once the shell has painted
  useEffect(() => { if (session && !tourDone()) { const t = setTimeout(() => setTour(true), 600); return () => clearTimeout(t); } }, [session]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk(o => !o); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  const unread = notifs.filter(n => !n.read).length;
  const linkCount = (to: string) => to === '/pasapoarte' ? counts.passports : to === '/baterii' ? counts.units : undefined;

  return (
    <div className="shell">
      <header className="topnav">
        <div className="topnav-inner">
          <Link to="/panou" className="brand" aria-label="Panou">
            <LogoMark size={40} c="var(--nav-active)" bg="var(--nav-bg)" a="#5eead4" />
            <div style={{ minWidth: 0 }}><b className="ellipsis">{orgName}</b><span>Plan {plan.charAt(0).toUpperCase() + plan.slice(1)}</span></div>
          </Link>
          <nav className="navlinks" aria-label="Navigare principală">
            {NAV.map(e => e.kind === 'link'
              ? <NavLink key={e.item.to} to={e.item.to} end={e.item.to === '/panou'} data-tour={'nav-' + e.item.to} className={({ isActive }) => 'nav' + (isActive ? ' active' : '')}>
                  {e.item.label}{linkCount(e.item.to) !== undefined && <span className="cnt">{linkCount(e.item.to)}</span>}
                </NavLink>
              : <NavGroup key={e.label} label={e.label} items={e.items} counts={counts} path={loc.pathname} />)}
          </nav>
          <div className="tools">
            <button className="search-trigger" data-tour="search" onClick={() => setCmdk(true)} aria-label="Caută"><Icon name="search" /><span className="lbl ellipsis">Caută…</span><kbd>Ctrl K</kbd></button>
            <button className="iconbtn" aria-label="Schimbă tema" title={theme === 'system' ? 'Temă: sistem' : theme === 'dark' ? 'Temă: întunecată' : 'Temă: luminoasă'} onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}><Icon name={theme === 'dark' ? 'moon' : 'sun'} /></button>
            <Menu trigger={t => (
              <button className="iconbtn" data-tour="notifications" aria-label={`Notificări${unread ? `, ${unread} necitite` : ''}`} onClick={t}><Icon name="bell" />{unread > 0 && <span className="ping" />}</button>)}>
              <div style={{ width: 340, display: 'grid' }} onClick={e => e.stopPropagation()}>
                <div className="row between" style={{ padding: '6px 10px' }}><b>Notificări</b>{unread > 0 && <button className="linkbtn small" onClick={() => notifActions.markAllRead()}>Marchează citite</button>}</div>
                <hr />
                {notifs.length === 0 && <div className="faint small" style={{ padding: 12 }}>Nicio notificare.</div>}
                {notifs.slice(0, 8).map(n => (
                  <button key={n.id} onClick={() => { notifActions.markRead(n.id); if (n.href) nav(n.href); }} style={{ alignItems: 'flex-start', display: 'grid', gap: 2 }}>
                    <span className="row nowrap-row" style={{ gap: 6 }}>{!n.read && <span style={{ width: 7, height: 7, borderRadius: 9, background: 'var(--accent)', flex: 'none' }} />}<b style={{ fontWeight: n.read ? 500 : 600 }}>{n.title}</b></span>
                    {n.body && <span className="muted small">{n.body}</span>}
                    <span className="faint small">{fmtRelative(n.at)}</span>
                  </button>
                ))}
              </div>
            </Menu>
            <Menu trigger={t => <button className="iconbtn" data-tour="help" onClick={t} aria-label="Ajutor" title="Ajutor"><Icon name="help" /></button>}>
              <button onClick={() => setTour(true)}><Icon name="sparkle" />Tur rapid (1 minut)</button>
              <button onClick={() => nav('/ghid')}><Icon name="passport" />Ghid pas cu pas</button>
              <hr />
              <button onClick={() => setCmdk(true)}><Icon name="search" />Căutare rapidă<span className="faint small" style={{ marginLeft: 'auto' }}>Ctrl K</span></button>
            </Menu>
            <Menu trigger={t => <button className="iconbtn" style={{ width: 40 }} onClick={t} aria-label="Cont"><span className="avatar">{initials(session.name)}</span></button>}>
              <div style={{ padding: '6px 10px' }} className="stack sm"><b>{session.name}</b><span className="faint small">{session.email}</span></div>
              <hr />
              <button onClick={() => nav('/setari')}><Icon name="settings" />Setări organizație</button>
              <button onClick={() => nav('/setari/echipa')}><Icon name="users" />Echipă</button>
              <button onClick={() => window.open('/cerere-acces', '_blank')}><Icon name="external" />Formular public de acces</button>
              <hr />
              <button className="danger" onClick={() => nav('/login?logout=1')}><Icon name="logout" />Ieșire</button>
            </Menu>
            <button className="iconbtn mobile-nav-btn" aria-label="Meniu" onClick={() => setMobile(true)}><Icon name="menu" /></button>
          </div>
        </div>
      </header>

      {mobile && <>
        <div className="drawer-overlay" style={{ zIndex: 60 }} onClick={() => setMobile(false)} />
        <nav className="mobile-nav" aria-label="Navigare">
          {NAV.map(e => e.kind === 'link'
            ? <NavLink key={e.item.to} to={e.item.to} end={e.item.to === '/panou'} className={({ isActive }) => (isActive ? 'active' : '')}><Icon name={e.item.icon} />{e.item.label}</NavLink>
            : <div key={e.label} style={{ display: 'grid', gap: 2 }}><div className="grp">{e.label}</div>{e.items.map(i => <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}><Icon name={i.icon} />{i.label}</NavLink>)}</div>)}
          <div className="grp">Cont</div>
          <NavLink to="/ghid" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="help" />Ghid</NavLink>
          <NavLink to="/setari"><Icon name="settings" />Setări</NavLink>
        </nav>
      </>}

      <div className="main"><Outlet /></div>
      {cmdk && <CommandPalette onClose={() => setCmdk(false)} />}
      {tour && <Tour onClose={() => setTour(false)} />}
    </div>
  );
}
