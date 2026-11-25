// "Am nevoie de DPP?" — interactive checker fed by the regulatory catalogue. Result updates live.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, useToast } from '../components/ui';
import { CATEGORIES, ROLE_NOTE, type Obligation, type Role } from '../data/regulations';
import { daysUntil } from '../lib/format';

export const ROLES: { id: Role; label: string }[] = [
  { id: 'importer', label: 'Importator' }, { id: 'distributor', label: 'Distribuitor' },
  { id: 'brand', label: 'Brand propriu' }, { id: 'marketplace', label: 'Vânzător pe marketplace' },
];
export const STATUS_LABEL: Record<Obligation['status'], string> = {
  in_force: 'Obligatoriu acum', adopted: 'Lege adoptată', indicative: 'Indicativ · act neadoptat', pending: 'În pregătire',
};
const fmt = (iso?: string) => iso ? iso.split('-').reverse().join('.') : '';

export interface CheckerPreset { cat: string; sub?: string; role: Role; b2c: boolean }

export function Checker({ preset }: { preset?: CheckerPreset }) {
  const toast = useToast();
  const [cat, setCat] = useState(preset?.cat ?? 'baterii');
  const [sub, setSub] = useState(preset?.sub ?? 'lmt');
  const [role, setRole] = useState<Role>(preset?.role ?? 'importer');
  const [b2c, setB2c] = useState(preset?.b2c ?? true);
  const [email, setEmail] = useState('');
  const c = CATEGORIES.find(x => x.id === cat)!;
  const obligations = useMemo(() => {
    const order = { in_force: 0, adopted: 1, pending: 2, indicative: 3 };
    return c.obligations
      .filter(o => !o.b2cOnly || b2c)
      .filter(o => !o.subtypes || !c.subtypes || o.subtypes.includes(sub))
      .sort((a, b) => order[a.status] - order[b.status] || String(a.date ?? '9').localeCompare(String(b.date ?? '9')));
  }, [c, b2c, sub]);
  const next = obligations.find(o => o.status === 'adopted' && o.date && daysUntil(o.date) > 0);

  return (
    <div className="s-checker">
      <div>
        <div className="s-step">
          <div className="q"><i>1</i>Ce importați?</div>
          <div className="s-cats">
            {CATEGORIES.map(x => (
              <button key={x.id} className="s-cat" aria-pressed={cat === x.id} onClick={() => { setCat(x.id); if (x.subtypes) setSub(x.subtypes[0]!.id); }}>
                <Icon name={x.icon} />{x.name}
              </button>
            ))}
          </div>
        </div>
        {c.subtypes && (
          <div className="s-step">
            <div className="q"><i>1b</i>Ce fel de baterie?</div>
            <div className="chips">{c.subtypes.map(s => <button key={s.id} className={'chip' + (sub === s.id ? ' on' : '')} onClick={() => setSub(s.id)}>{s.label}</button>)}</div>
          </div>
        )}
        <div className="s-step">
          <div className="q"><i>2</i>Rolul vostru</div>
          <div className="seg" style={{ flexWrap: 'wrap' }}>{ROLES.map(r => <button key={r.id} aria-pressed={role === r.id} onClick={() => setRole(r.id)}>{r.label}</button>)}</div>
        </div>
        <div className="s-step">
          <div className="q"><i>3</i>Vindeți către consumatori?</div>
          <div className="seg"><button aria-pressed={b2c} onClick={() => setB2c(true)}>Da</button><button aria-pressed={!b2c} onClick={() => setB2c(false)}>Nu, doar B2B</button></div>
        </div>
      </div>

      <aside className="s-result print-area" aria-live="polite">
        <div className="head">
          <small>Rezultat pentru</small>
          <b style={{ fontFamily: 'var(--fh)', fontSize: 18 }}>{c.name}{c.subtypes ? ` · ${c.subtypes.find(s => s.id === sub)?.label}` : ''}</b>
          {next && <small>Următorul termen ferm: {fmt(next.date)} (în {daysUntil(next.date!)} de zile)</small>}
        </div>
        <div className="body">
          {obligations.length === 0 && <p className="muted">Pentru vânzare doar B2B, în această categorie nu există încă obligații de pașaport adoptate. Urmăriți alertele.</p>}
          {obligations.map(o => (
            <div key={o.title} className="s-ob">
              <span className={'st ' + o.status} aria-hidden="true" />
              <b>{o.title}</b>
              <div className="meta">
                <span className={'stag ' + o.status}>{STATUS_LABEL[o.status]}</span>
                {(o.date || o.dateLabel) && <span>{o.status === 'indicative' ? o.dateLabel : (o.status === 'in_force' ? 'din ' : 'de la ') + fmt(o.date)}</span>}
                <a href={o.url} target="_blank" rel="noreferrer">{o.law}{o.verify ? ' *' : ''}</a>
              </div>
              <p>{o.detail}</p>
            </div>
          ))}
          <div className="callout info"><Icon name="info" /><div className="grow">{ROLE_NOTE[role]}</div></div>
          <div className="stack sm">
            <b style={{ fontSize: 13.5 }}>Ce cereți fabricii</b>
            <div className="s-docs">{c.documents.map(d => <span key={d}>{d}</span>)}</div>
          </div>
          <form className="stack sm no-print" onSubmit={e => { e.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Introdu o adresă de e-mail validă.', 'bad'); return; } try { localStorage.setItem('dpp4all-alerts', JSON.stringify({ email, cat, sub })); } catch { /* ignore */ } toast(`Te anunțăm la fiecare schimbare pentru ${c.name.toLowerCase()}.`); setEmail(''); }}>
            <div className="row nowrap-row"><input className="input" type="email" aria-label="E-mail pentru alerte" placeholder="E-mail pentru alerte" value={email} onChange={e => setEmail(e.target.value)} /><button className="btn">Trimite-mi alerte</button></div>
          </form>
          <div className="row no-print">
            <Link className="btn primary" to="/inregistrare">Creează primul pașaport</Link>
            <button className="btn ghost" onClick={() => window.print()}><Icon name="print" />Descarcă PDF</button>
          </div>
          <p className="faint small">Linie punctată / „indicativ” = dată din planul Comisiei, fără lege adoptată. {obligations.some(o => o.verify) ? '* De verificat în Jurnalul Oficial.' : ''} Informații generale, nu consultanță juridică.</p>
        </div>
      </aside>
    </div>
  );
}
