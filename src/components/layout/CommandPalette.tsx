// Ctrl+K: jump to any page, passport or battery serial; run quick actions.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDB } from '../../api/store';
import { Icon } from '../ui';

type Item = { group: string; label: string; hint?: string; icon: string; go: string };

const PAGES: Item[] = [
  ['Panou', '/panou', 'dashboard'], ['Site public (Acasă)', '/', 'globe'], ['Pașapoarte', '/pasapoarte', 'passport'], ['Pașaport nou', '/pasapoarte/nou', 'plus'], ['Baterii', '/baterii', 'battery'],
  ['Import date', '/import', 'import'], ['Export și backup', '/export', 'export'], ['Documente', '/documente', 'doc'], ['Etichete și QR', '/etichete', 'tag'],
  ['Telemetrie BMS', '/telemetrie', 'pulse'], ['Acces date', '/acces', 'lock'], ['Statistici scanări', '/statistici', 'chart'], ['Integrări și API', '/integrari', 'webhook'],
  ['Termene', '/termene', 'calendar'], ['Ghid pas cu pas', '/ghid', 'help'], ['Activitate', '/activitate', 'activity'], ['Setări', '/setari', 'settings'], ['Echipă', '/setari/echipa', 'users'],
].map(([label, go, icon]) => ({ group: 'Pagini', label, go, icon }));

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const items = useMemo(() => {
    const db = getDB();
    const s = q.trim().toLowerCase();
    const pp: Item[] = db.passports.filter(p => p.status !== 'trashed').map(p => ({ group: 'Pașapoarte', label: p.name, hint: p.gtin ?? undefined, icon: 'passport', go: `/pasapoarte/${p.id}` }));
    const un: Item[] = s.length >= 2 ? db.units.filter(u => u.serial.toLowerCase().includes(s)).slice(0, 8).map(u => ({ group: 'Baterii', label: u.serial, hint: db.passports.find(p => p.id === u.passportId)?.name, icon: 'battery', go: `/pasapoarte/${u.passportId}/baterii/${u.id}` })) : [];
    const all = [...PAGES, ...pp, ...un];
    return s ? all.filter(i => i.group === 'Baterii' || (i.label + ' ' + (i.hint ?? '')).toLowerCase().includes(s)).slice(0, 30) : all.slice(0, 24);
  }, [q]);
  const go = (i?: Item) => { if (!i) return; nav(i.go); onClose(); };
  let lastGroup = '';
  return (
    <div className="cmdk" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="cmdk-box" role="dialog" aria-label="Căutare">
        <input autoFocus placeholder="Caută pașapoarte, serii de baterii, pagini…" value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
            if (e.key === 'Enter') go(items[sel]);
          }} />
        <div className="cmdk-list" role="listbox">
          {items.length === 0 && <div className="faint" style={{ padding: 16 }}>Niciun rezultat.</div>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? <div className="cmdk-group">{(lastGroup = it.group)}</div> : null;
            return <div key={it.group + it.go + it.label}>{head}<button className="cmdk-item" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)}><Icon name={it.icon} size={16} /><span className="ellipsis">{it.label}</span>{it.hint && <span className="k mono">{it.hint}</span>}</button></div>;
          })}
        </div>
      </div>
    </div>
  );
}
