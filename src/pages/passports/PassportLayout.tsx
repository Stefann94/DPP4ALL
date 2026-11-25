import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useDB } from '../../api/store';
import { passports as pa } from '../../api/actions';
import { categoryLabel, profileOf } from '../../data/catalog';
import { completeness } from '../../lib/validation';
import { Callout, Empty, Icon, Modal, MoreMenu, Progress, StatusBadge, useToast } from '../../components/ui';
import '../../styles/passports.css';

export default function PassportLayout() {
  const { id } = useParams();
  const passport = useDB(d => d.passports.find(p => p.id === id));
  const unitCount = useDB(d => d.units.filter(u => u.passportId === id).length);
  const docCount = useDB(d => d.documents.filter(x => x.passportIds.includes(id ?? '')).length);
  const verCount = useDB(d => d.versions.filter(v => v.passportId === id).length);
  const role = useDB(d => d.session?.role);
  const nav = useNavigate();
  const toast = useToast();
  const [pubOpen, setPubOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const c = useMemo(() => (passport ? completeness(passport) : null), [passport]);

  if (!passport || !c) {
    return <div className="page narrow"><div className="card"><Empty icon="passport" title="Pașaportul nu există" action={<Link className="btn" to="/pasapoarte">Înapoi la pașapoarte</Link>}>Poate a fost șters definitiv.</Empty></div></div>;
  }
  const trashed = passport.status === 'trashed';
  const canEdit = role !== 'viewer';
  const left = c.total - c.done;

  const doPublish = async () => {
    setBusy(true);
    const r = await pa.publish(passport.id, note.trim() || undefined);
    setBusy(false);
    if (r.ok) { toast(`Publicat · v${r.version.version}`); setPubOpen(false); setNote(''); }
    else toast(r.reason, 'bad');
  };

  const tabs: { to: string; label: string; count?: number; show?: boolean }[] = [
    { to: '', label: 'Editor' },
    { to: 'baterii', label: 'Baterii', count: unitCount, show: profileOf(passport.category) === 'battery_full' },
    { to: 'documente', label: 'Documente', count: docCount },
    { to: 'versiuni', label: 'Versiuni', count: verCount },
    { to: 'qr', label: 'QR și etichete' },
    { to: 'acces', label: 'Acces' },
    { to: 'statistici', label: 'Statistici' },
    { to: 'setari', label: 'Setări' },
  ];

  return (
    <div className="page">
      <div className="pp-head">
        <div className="crumbs"><Link to="/pasapoarte">Pașapoarte</Link><span>/</span><span>{passport.name}</span></div>
        <div className="title-row">
          <h1>{passport.name}</h1>
          <StatusBadge status={passport.status} />
          {passport.status === 'published' && passport.publishedVersion !== passport.version && <span className="badge warn">modificări nepublicate</span>}
          <div className="grow" />
          <div className="row">
            <a className="btn" href={`/p/${passport.id}`} target="_blank" rel="noopener"><Icon name="eye" />Previzualizare</a>
            {canEdit && !trashed && (
              <button className="btn primary" disabled={!c.canPublish} title={c.canPublish ? undefined : `${c.errors.length} probleme de rezolvat`} onClick={() => setPubOpen(true)}>
                <Icon name="check" />{passport.status === 'published' ? 'Publică versiunea nouă' : 'Publică'}
              </button>
            )}
            {canEdit && (
              <MoreMenu>
                {passport.status === 'published' && <button onClick={() => { pa.unpublish(passport.id); toast('Retras de la publicare'); }}><Icon name="eye" />Retrage de la publicare</button>}
                <button onClick={() => { const n = pa.duplicate(passport.id); if (n) { toast('Copie creată'); nav(`/pasapoarte/${n.id}`); } }}><Icon name="copy" />Duplică</button>
                <button onClick={() => nav(`/export?ids=${passport.id}`)}><Icon name="export" />Exportă</button>
                <hr />
                {trashed
                  ? <button onClick={() => { pa.restore(passport.id); toast('Restaurat ca ciornă'); }}><Icon name="refresh" />Restaurează</button>
                  : <button className="danger" onClick={() => { pa.trash(passport.id); toast('Mutat în coș'); }}><Icon name="trash" />Mută în coș</button>}
              </MoreMenu>
            )}
          </div>
        </div>
        <div className="row" style={{ gap: '6px 16px' }}>
          <span className="muted">{categoryLabel(passport.category)}</span>
          {passport.gtin && <span className="mono muted">GTIN {passport.gtin}</span>}
          <div className="pp-meter">
            <Progress value={c.pct} tone={c.pct === 100 ? 'ok' : undefined} />
            <span className="small muted num">{c.pct}% · {left === 0 ? 'complet' : `${left} rămase`}</span>
          </div>
        </div>
        {trashed && (
          <Callout kind="warn">
            <div className="row between"><span>Pașaportul e în coș și nu poate fi modificat.</span>{canEdit && <button className="btn sm" onClick={() => pa.restore(passport.id)}>Restaurează</button>}</div>
          </Callout>
        )}
        <nav className="tabs pp-tabs" aria-label="Secțiuni pașaport">
          {tabs.filter(t => t.show !== false).map(t => (
            <NavLink key={t.to} to={t.to} end={t.to === ''} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}{t.count !== undefined && t.count > 0 && <span className="count">{t.count}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet context={{ passport }} />

      {pubOpen && (
        <Modal title={passport.status === 'published' ? 'Publică versiunea nouă' : 'Publică pașaportul'} onClose={() => setPubOpen(false)}
          footer={<><button className="btn" onClick={() => setPubOpen(false)}>Anulează</button><button className="btn primary" disabled={busy} onClick={doPublish}>{busy ? 'Se publică…' : 'Publică'}</button></>}>
          <dl className="kv">
            <dt>Produs</dt><dd>{passport.name}</dd>
            <dt>Versiune</dt><dd className="num">v{passport.version}</dd>
            <dt>Completare</dt><dd>{c.done}/{c.total} obligatorii acum{c.later.length > 0 && <span className="faint"> · {c.later.length} obligatorii din 2027 lipsesc</span>}</dd>
            {c.advisories.length > 0 && <><dt>Avertismente</dt><dd>{c.advisories.length} (nu blochează)</dd></>}
          </dl>
          <div className="field">
            <label htmlFor="pub-note">Notă versiune</label>
            <input id="pub-note" className="input" placeholder="ex. actualizare rapoarte de testare" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <p className="small muted">Se salvează o copie a acestei versiuni cu amprentă SHA-256. Codul QR afișează imediat datele noi.</p>
        </Modal>
      )}
    </div>
  );
}
