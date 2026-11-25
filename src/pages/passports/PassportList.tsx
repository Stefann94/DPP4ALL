import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDB } from '../../api/store';
import { passports as pa } from '../../api/actions';
import { CATEGORIES } from '../../data/catalog';
import { completeness } from '../../lib/validation';
import { fmtRelative } from '../../lib/format';
import { ConfirmButton, Empty, Icon, PageHead, Progress, Segmented, StatusBadge, useToast } from '../../components/ui';
import type { Passport } from '../../types';
import '../../styles/passports.css';

type View = 'active' | 'draft' | 'published' | 'trashed';
type Sort = 'updated' | 'name' | 'pct';

export default function PassportList() {
  const all = useDB(d => d.passports);
  const units = useDB(d => d.units);
  const role = useDB(d => d.session?.role);
  const nav = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<View>('active');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [ready, setReady] = useState<'' | 'ready' | 'incomplete'>('');
  const [sort, setSort] = useState<Sort>('updated');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const canEdit = role !== 'viewer';

  const rows = useMemo(() => {
    const unitCount = new Map<string, number>();
    for (const u of units) unitCount.set(u.passportId, (unitCount.get(u.passportId) ?? 0) + 1);
    const s = q.trim().toLowerCase();
    return all
      .filter(p => view === 'trashed' ? p.status === 'trashed' : p.status !== 'trashed' && (view === 'active' || p.status === view))
      .filter(p => !cat || p.category === cat)
      .filter(p => !s || [p.name, p.gtin ?? '', String(p.data.identificare?.battery_model_identifier ?? '')].join(' ').toLowerCase().includes(s))
      .map(p => ({ p, c: completeness(p), units: unitCount.get(p.id) ?? 0 }))
      .filter(r => !ready || (ready === 'ready' ? r.c.canPublish : !r.c.canPublish))
      .sort((a, b) => sort === 'name' ? a.p.name.localeCompare(b.p.name, 'ro') : sort === 'pct' ? a.c.pct - b.c.pct : b.p.updatedAt.localeCompare(a.p.updatedAt));
  }, [all, units, view, q, cat, ready, sort]);

  const counts = useMemo(() => ({
    active: all.filter(p => p.status !== 'trashed').length,
    draft: all.filter(p => p.status === 'draft').length,
    published: all.filter(p => p.status === 'published').length,
    trashed: all.filter(p => p.status === 'trashed').length,
  }), [all]);

  const selected = rows.filter(r => sel.has(r.p.id));
  const allSel = rows.length > 0 && rows.every(r => sel.has(r.p.id));
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const publishSelected = async () => {
    let ok = 0, skip = 0;
    for (const r of selected) {
      if (r.p.status === 'trashed' || !r.c.canPublish) { skip++; continue; }
      const res = await pa.publish(r.p.id); res.ok ? ok++ : skip++;
    }
    toast(`${ok} publicate${skip ? ` · ${skip} sărite (incomplete)` : ''}`);
    setSel(new Set());
  };

  return (
    <div className="page">
      <PageHead title="Pașapoarte" actions={canEdit && <>
        <Link className="btn" to="/import"><Icon name="import" />Import</Link>
        <Link className="btn primary" to="/pasapoarte/nou"><Icon name="plus" />Pașaport nou</Link>
      </>} />

      <div className="row between">
        <Segmented value={view} onChange={v => { setView(v); setSel(new Set()); }} items={[
          { value: 'active', label: `Toate ${counts.active}` }, { value: 'draft', label: `Ciorne ${counts.draft}` },
          { value: 'published', label: `Publicate ${counts.published}` }, { value: 'trashed', label: `Coș ${counts.trashed}` },
        ]} />
        <div className="row">
          <input className="input" style={{ width: 220 }} placeholder="Caută nume, GTIN, model" value={q} onChange={e => setQ(e.target.value)} aria-label="Caută" />
          <select className="select" style={{ width: 'auto' }} value={cat} onChange={e => setCat(e.target.value)} aria-label="Categorie">
            <option value="">Toate categoriile</option>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={ready} onChange={e => setReady(e.target.value as typeof ready)} aria-label="Completare">
            <option value="">Orice stadiu</option><option value="ready">Gata de publicare</option><option value="incomplete">Incomplete</option>
          </select>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sortare">
            <option value="updated">Recent modificate</option><option value="name">Nume</option><option value="pct">Completare</option>
          </select>
        </div>
      </div>

      {selected.length > 0 && canEdit && (
        <div className="sel-bar">
          <b>{selected.length} selectate</b>
          <div className="grow" />
          {view === 'trashed' ? <>
            <button className="btn sm" onClick={() => { selected.forEach(r => pa.restore(r.p.id)); setSel(new Set()); toast('Restaurate'); }}>Restaurează</button>
            <ConfirmButton className="btn sm danger" confirmText="Șterge definitiv" onConfirm={() => { selected.forEach(r => pa.deleteForever(r.p.id)); setSel(new Set()); toast('Șterse definitiv'); }}>Șterge definitiv</ConfirmButton>
          </> : <>
            <button className="btn sm" onClick={publishSelected}><Icon name="check" />Publică</button>
            <button className="btn sm" onClick={() => nav(`/export?ids=${selected.map(r => r.p.id).join(',')}`)}><Icon name="export" />Exportă</button>
            <button className="btn sm" onClick={() => nav(`/etichete?ids=${selected.map(r => r.p.id).join(',')}`)}><Icon name="qr" />Coduri QR</button>
            <button className="btn sm danger" onClick={() => { selected.forEach(r => pa.trash(r.p.id)); setSel(new Set()); toast('Mutate în coș'); }}><Icon name="trash" />În coș</button>
          </>}
          <button className="btn sm ghost" onClick={() => setSel(new Set())}>Anulează</button>
        </div>
      )}

      <div className="card flush">
        {rows.length === 0 ? (
          all.length === 0
            ? <Empty icon="passport" title="Niciun pașaport" action={canEdit && <div className="row"><Link className="btn primary" to="/pasapoarte/nou">Creează primul pașaport</Link><Link className="btn" to="/import">Importă din Excel</Link></div>}>Un pașaport descrie un model de baterie.</Empty>
            : <Empty icon="search" title={view === 'trashed' ? 'Coșul e gol' : 'Niciun rezultat'}>{view !== 'trashed' && 'Schimbă filtrele sau căutarea.'}</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th className="shrink">{canEdit && <input type="checkbox" aria-label="Selectează tot" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map(r => r.p.id)))} />}</th>
                <th>Produs</th><th>Categorie</th><th>GTIN</th><th>Stare</th><th style={{ minWidth: 140 }}>Completare</th><th className="shrink">Baterii</th><th className="shrink">Modificat</th>
                {view === 'trashed' && <th className="shrink" />}
              </tr></thead>
              <tbody>
                {rows.map(({ p, c, units: n }) => <Row key={p.id} p={p} pct={c.pct} ready={c.canPublish} units={n} checked={sel.has(p.id)} onCheck={() => toggle(p.id)} canEdit={canEdit} trashed={view === 'trashed'} onOpen={() => nav(`/pasapoarte/${p.id}`)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ p, pct, ready, units, checked, onCheck, canEdit, trashed, onOpen }: { p: Passport; pct: number; ready: boolean; units: number; checked: boolean; onCheck: () => void; canEdit: boolean; trashed: boolean; onOpen: () => void }) {
  const toast = useToast();
  return (
    <tr className="clickable" onClick={onOpen}>
      <td className="shrink" onClick={e => e.stopPropagation()}>{canEdit && <input type="checkbox" aria-label={`Selectează ${p.name}`} checked={checked} onChange={onCheck} />}</td>
      <td><Link to={`/pasapoarte/${p.id}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--ink)', fontWeight: 600 }}>{p.name}</Link>
        {p.linkedFromPassportId && <span className="badge accent" style={{ marginLeft: 6 }}>a doua viață</span>}</td>
      <td className="muted nowrap">{CATEGORIES.find(c => c.value === p.category)?.short ?? '—'}</td>
      <td className="mono muted nowrap">{p.gtin ?? '—'}</td>
      <td><StatusBadge status={p.status} /></td>
      <td><div className="row nowrap-row" style={{ gap: 8 }}><div style={{ flex: 1, minWidth: 60 }}><Progress value={pct} tone={pct === 100 ? 'ok' : undefined} /></div><span className="small num muted" style={{ width: 34, textAlign: 'right' }}>{pct}%</span>{ready && pct < 100 && <span className="badge ok" title="Poate fi publicat">ok</span>}</div></td>
      <td className="num shrink" style={{ textAlign: 'right' }}>{units || '—'}</td>
      <td className="small muted shrink">{fmtRelative(p.updatedAt)}</td>
      {trashed && <td className="shrink" onClick={e => e.stopPropagation()}><button className="btn sm" onClick={() => { pa.restore(p.id); toast('Restaurat'); }}>Restaurează</button></td>}
    </tr>
  );
}
