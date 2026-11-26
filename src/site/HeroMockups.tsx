// /machete/hero — four hero layouts following the agreed plan:
// eyebrow + "Pașapoarte digitale pentru tot ce importați" + checker form + live answer card + proof strip.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { QrCode } from '../components/Codes';
import { SiteLayout } from './SiteLayout';
import { ROLES, STATUS_LABEL, type CheckerPreset } from './Checker';
import { CATEGORIES, ROLE_NOTE } from '../data/regulations';
import { daysUntil } from '../lib/format';
import './heromock.css';

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('.') : '');
const GRAN: Record<string, string> = { item: 'per bucată, cu cod QR pe fiecare produs', model_eprel: 'per model, legat de baza EPREL', doc: 'în locul declarației de conformitate', general: 'pe produs și în anunțul online' };

/** Derives the hero answer from the regulatory catalogue. */
function useAnswer(q: CheckerPreset) {
  return useMemo(() => {
    const c = CATEGORIES.find(x => x.id === q.cat)!;
    const obs = c.obligations.filter(o => (!o.b2cOnly || q.b2c) && (!o.subtypes || !c.subtypes || o.subtypes.includes(q.sub ?? '')));
    const firm = obs.filter(o => o.status === 'adopted' && o.date && daysUntil(o.date) > 0).sort((a, b) => a.date!.localeCompare(b.date!))[0];
    const now = obs.find(o => o.status === 'in_force');
    const ind = obs.find(o => o.status === 'indicative');
    const head = firm ?? now ?? ind ?? obs[0];
    const smallBattery = c.id === 'baterii' && q.sub === 'portable';
    return { c, obs, head, firm, now, ind, gran: smallBattery ? 'doar cod QR cu informații, fără pașaport complet' : GRAN[c.family], docs: c.documents, role: ROLE_NOTE[q.role] };
  }, [q]);
}

function Form({ q, setQ, layout = 'grid' }: { q: CheckerPreset; setQ: (q: CheckerPreset) => void; layout?: 'grid' | 'row' }) {
  const c = CATEGORIES.find(x => x.id === q.cat)!;
  return (
    <form className={'hm2-form ' + layout + (c.subtypes ? '' : ' three')} onSubmit={e => e.preventDefault()}>
      <label><small>Ce importați?</small>
        <select value={q.cat} onChange={e => { const n = CATEGORIES.find(x => x.id === e.target.value)!; setQ({ ...q, cat: n.id, sub: n.subtypes?.[0]?.id }); }}>{CATEGORIES.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </label>
      {c.subtypes && <label><small>Ce fel?</small><select value={q.sub} onChange={e => setQ({ ...q, sub: e.target.value })}>{c.subtypes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
      <label><small>Rolul vostru</small><select value={q.role} onChange={e => setQ({ ...q, role: e.target.value as CheckerPreset['role'] })}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
      <label><small>Vindeți către</small><select value={q.b2c ? 'b2c' : 'b2b'} onChange={e => setQ({ ...q, b2c: e.target.value === 'b2c' })}><option value="b2c">Consumatori</option><option value="b2b">Doar firme (B2B)</option></select></label>
      <a className="btn primary lg" href="#verificator">Verifică</a>
    </form>
  );
}

function AnswerCard({ q, compact }: { q: CheckerPreset; compact?: boolean }) {
  const a = useAnswer(q);
  const h = a.head;
  return (
    <div className={'hm2-card' + (compact ? ' compact' : '')} aria-live="polite">
      <div className="hm2-card-top"><span>{a.c.name}{a.c.subtypes ? ` · ${a.c.subtypes.find(s => s.id === q.sub)?.label}` : ''}</span><span className={'stag ' + (h?.status ?? 'indicative')}>{h ? STATUS_LABEL[h.status] : '—'}</span></div>
      {h && (
        <div className="hm2-big">
          {h.status === 'indicative' ? <><b>{h.dateLabel}</b><span>dată indicativă, fără lege adoptată</span></>
            : h.status === 'in_force' ? <><b>Obligatoriu acum</b><span>din {fmt(h.date)}</span></>
            : h.date ? <><b>Obligatoriu din {fmt(h.date)}</b><span>peste {daysUntil(h.date)} de zile</span></> : <><b>{h.title}</b></>}
        </div>
      )}
      <ul className="hm2-facts">
        <li><Icon name="passport" size={16} /><span>{h?.title}</span></li>
        <li><Icon name="qr" size={16} /><span>Pașaport {a.gran}</span></li>
        <li><Icon name="doc" size={16} /><span><b>{a.docs.length} documente</b> de cerut fabricii: {a.docs.slice(0, 2).join(', ')}…</span></li>
      </ul>
      {!compact && <p className="hm2-role">{a.role}</p>}
      <div className="hm2-card-foot"><a className="btn primary" href="#furnizori">Cere datele fabricii <Icon name="arrowRight" size={15} /></a><a className="hm2-src" href={h?.url} target="_blank" rel="noreferrer">{h?.law}</a></div>
    </div>
  );
}

const Proof = () => (
  <div className="hm2-proof">
    <span><Icon name="check" size={15} />Registrul UE al pașapoartelor e activ din 20.07.2026</span>
    <span><Icon name="check" size={15} />Construit pe standardele EN 18216–18223, citate în Jurnalul Oficial</span>
    <span><Icon name="check" size={15} />Date găzduite în România</span>
  </div>
);

const Copy = ({ center }: { center?: boolean }) => (
  <div className={'hm2-copy' + (center ? ' center' : '')}>
    <span className="hm2-eyebrow">Pentru importatori de produse fabricate în afara UE</span>
    <h1>Pașapoarte digitale pentru tot ce importați</h1>
    <p>Aflați în 60 de secunde ce vi se aplică. Fabrica completează datele în chineză, voi aprobați, iar pașaportul se publică cu cod QR, pregătit pentru registrul UE.</p>
  </div>
);

function Label({ n, name, note }: { n: string; name: string; note: string }) {
  return <div className="hm2-label"><div className="wrap"><span>{n}</span><div><b>{name}</b><p>{note}</p></div></div></div>;
}

function Section({ children, tint }: { children: ReactNode; tint?: boolean }) {
  return <section className={'hm2-hero' + (tint ? ' tint' : '')}><div className="wrap">{children}</div></section>;
}

export default function HeroMockups() {
  const [q, setQ] = useState<CheckerPreset>({ cat: 'baterii', sub: 'lmt', role: 'importer', b2c: true });
  const a = useAnswer(q);
  return (
    <SiteLayout>
      <div className="hm2-intro"><div className="wrap">
        <p><Link to="/">← Acasă</Link></p>
        <h2>Machete hero</h2>
        <p className="muted">Patru așezări pentru același plan. Formularul e funcțional în toate: schimbă categoria și cardul se actualizează (starea e comună, deci se schimbă în toate cele patru).</p>
      </div></div>

      {/* H1 — split: form left, answer card right */}
      <Label n="H1" name="Card de răspuns în dreapta" note="Planul de bază: text și formular în stânga, răspunsul live în dreapta, faptele dedesubt." />
      <Section tint>
        <div className="hm2-split">
          <div><Copy /><Form q={q} setQ={setQ} /><a className="hm2-demo" href="#demo">Vezi un pașaport demo →</a></div>
          <AnswerCard q={q} />
        </div>
        <Proof />
      </Section>

      {/* H2 — wide form, answer as strip */}
      <Label n="H2" name="Formular lat, răspuns pe orizontală" note="Titlul pe toată lățimea, formularul pe un rând, iar răspunsul apare imediat dedesubt ca o bandă cu trei coloane." />
      <Section>
        <Copy />
        <Form q={q} setQ={setQ} layout="row" />
        <div className="hm2-strip">
          <div><small>{a.head ? STATUS_LABEL[a.head.status] : ''}</small><b>{a.head?.status === 'indicative' ? a.head.dateLabel : a.head?.status === 'in_force' ? 'Obligatoriu acum' : `Din ${fmt(a.head?.date)}`}</b><span>{a.head?.title}</span></div>
          <div><small>Cum arată</small><b>Pașaport {a.gran.split(',')[0]}</b><span>{a.gran.includes(',') ? a.gran.split(',').slice(1).join(',').trim() : 'cod QR pe produs'}</span></div>
          <div><small>Ce cereți fabricii</small><b>{a.docs.length} documente</b><span>{a.docs.slice(0, 3).join(' · ')}</span></div>
          <a className="btn primary lg" href="#furnizori">Cere datele fabricii <Icon name="arrowRight" size={16} /></a>
        </div>
        <Proof />
      </Section>

      {/* H3 — card + supplier phone */}
      <Label n="H3" name="Card + telefonul fabricii" note="Ca H1, dar peste card stă un telefon cu formularul în chineză primit de fabrică: arată direct diferențiatorul." />
      <Section tint>
        <div className="hm2-split">
          <div><Copy /><Form q={q} setQ={setQ} /><a className="hm2-demo" href="#demo">Vezi un pașaport demo →</a></div>
          <div className="hm2-stack">
            <AnswerCard q={q} compact />
            <div className="hm2-phone" lang="zh">
              <div className="hm2-phone-bar"><b>欧盟数字产品护照</b><span>供应商数据填写</span></div>
              <div className="hm2-phone-body">
                <span>您的欧盟客户请您提供以下资料：</span>
                {a.docs.slice(0, 3).map(d => <div key={d} className="hm2-pf"><Icon name="upload" size={12} />{d}</div>)}
                <div className="hm2-pbtn">开始填写</div>
              </div>
            </div>
          </div>
        </div>
        <Proof />
      </Section>

      {/* H4 — three-step path */}
      <Label n="H4" name="Trei pași, cu răspunsul în primul" note="Formularul sus, iar dedesubt drumul complet: ce vi se aplică → ce cereți fabricii → cum arată pașaportul." />
      <Section>
        <div className="hm2-center"><Copy center /><Form q={q} setQ={setQ} layout="row" /></div>
        <div className="hm2-steps">
          <div className="hm2-step"><span className="n">1</span><small>Ce vi se aplică</small><b>{a.head?.status === 'indicative' ? a.head.dateLabel : a.head?.status === 'in_force' ? 'Obligatoriu acum' : `Din ${fmt(a.head?.date)}`}</b><p>{a.head?.title}</p><span className={'stag ' + (a.head?.status ?? '')}>{a.head ? STATUS_LABEL[a.head.status] : ''}</span></div>
          <div className="hm2-step"><span className="n">2</span><small>Ce cereți fabricii</small><b>{a.docs.length} documente</b><ul>{a.docs.slice(0, 4).map(d => <li key={d}>{d}</li>)}</ul></div>
          <div className="hm2-step"><span className="n">3</span><small>Cum arată pașaportul</small><b>Pașaport {a.gran.split(',')[0]}</b><div className="hm2-mini"><QrCode value={`${location.origin}/p/pp_homecell10`} size={64} /><span>{a.c.name}<br /><em>Producător · Importator · Date tehnice</em></span></div></div>
        </div>
        <Proof />
      </Section>
    </SiteLayout>
  );
}
