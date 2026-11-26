// Hero building blocks (H3 layout): copy, checker form, live answer card, supplier phone, proof strip.
// Shared by the Home page and /machete/hero.
import { useMemo } from 'react';
import { Icon } from '../components/ui';
import { ROLES, STATUS_LABEL, type CheckerPreset } from './Checker';
import { CATEGORIES, ROLE_NOTE } from '../data/regulations';
import { daysUntil } from '../lib/format';
import './heromock.css';

export const fmtDate = (iso?: string) => (iso ? iso.split('-').reverse().join('.') : '');
const GRAN: Record<string, string> = { item: 'per bucată, cu cod QR pe fiecare produs', model_eprel: 'per model, legat de baza EPREL', doc: 'în locul declarației de conformitate', general: 'pe produs și în anunțul online' };

/** Derives the hero answer for a checker selection from the regulatory catalogue. */
export function useAnswer(q: CheckerPreset) {
  return useMemo(() => {
    const c = CATEGORIES.find(x => x.id === q.cat)!;
    const obs = c.obligations.filter(o => (!o.b2cOnly || q.b2c) && (!o.subtypes || !c.subtypes || o.subtypes.includes(q.sub ?? '')));
    const firm = obs.filter(o => o.status === 'adopted' && o.date && daysUntil(o.date) > 0).sort((a, b) => a.date!.localeCompare(b.date!))[0];
    const now = obs.find(o => o.status === 'in_force');
    const ind = obs.find(o => o.status === 'indicative');
    const head = firm ?? now ?? ind ?? obs[0];
    const smallBattery = c.id === 'baterii' && q.sub === 'portable';
    return { c, obs, head, gran: smallBattery ? 'doar cod QR cu informații, fără pașaport complet' : GRAN[c.family], docs: c.documents, role: ROLE_NOTE[q.role] };
  }, [q]);
}

export function HeroCopy({ center }: { center?: boolean }) {
  return (
    <div className={'hm2-copy' + (center ? ' center' : '')}>
      <span className="hm2-eyebrow">Pentru importatori de produse fabricate în afara UE</span>
      <h1>Pașapoarte digitale pentru tot ce importați</h1>
      <p>Aflați în 60 de secunde ce vi se aplică. Fabrica completează datele în chineză, voi aprobați, iar pașaportul se publică cu cod QR, pregătit pentru registrul UE.</p>
    </div>
  );
}

export function HeroForm({ q, setQ, layout = 'grid', onVerify }: { q: CheckerPreset; setQ: (q: CheckerPreset) => void; layout?: 'grid' | 'row'; onVerify?: () => void }) {
  const c = CATEGORIES.find(x => x.id === q.cat)!;
  return (
    <form className={'hm2-form ' + layout + (c.subtypes ? '' : ' three')} onSubmit={e => { e.preventDefault(); onVerify?.(); }}>
      <label><small>Ce importați?</small>
        <select value={q.cat} onChange={e => { const n = CATEGORIES.find(x => x.id === e.target.value)!; setQ({ ...q, cat: n.id, sub: n.subtypes?.[0]?.id }); }}>{CATEGORIES.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </label>
      {c.subtypes && <label><small>Ce fel?</small><select value={q.sub} onChange={e => setQ({ ...q, sub: e.target.value })}>{c.subtypes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
      <label><small>Rolul vostru</small><select value={q.role} onChange={e => setQ({ ...q, role: e.target.value as CheckerPreset['role'] })}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
      <label><small>Vindeți către</small><select value={q.b2c ? 'b2c' : 'b2b'} onChange={e => setQ({ ...q, b2c: e.target.value === 'b2c' })}><option value="b2c">Consumatori</option><option value="b2b">Doar firme (B2B)</option></select></label>
      {onVerify ? <button className="btn primary lg">Vezi tot rezultatul</button> : <a className="btn primary lg" href="#verificator">Verifică</a>}
    </form>
  );
}

export function AnswerCard({ q, compact, requestHref = '#furnizori' }: { q: CheckerPreset; compact?: boolean; requestHref?: string }) {
  const a = useAnswer(q);
  const h = a.head;
  return (
    <div className={'hm2-card' + (compact ? ' compact' : '')} aria-live="polite">
      <div className="hm2-card-top"><span>{a.c.name}{a.c.subtypes ? ` · ${a.c.subtypes.find(s => s.id === q.sub)?.label}` : ''}</span><span className={'stag ' + (h?.status ?? 'indicative')}>{h ? STATUS_LABEL[h.status] : '—'}</span></div>
      {h && (
        <div className="hm2-big">
          {h.status === 'indicative' ? <><b>{h.dateLabel}</b><span>dată indicativă, fără lege adoptată</span></>
            : h.status === 'in_force' ? <><b>Obligatoriu acum</b><span>din {fmtDate(h.date)}</span></>
            : h.date ? <><b>Obligatoriu din {fmtDate(h.date)}</b><span>peste {daysUntil(h.date)} de zile</span></> : <><b>{h.title}</b></>}
        </div>
      )}
      <ul className="hm2-facts">
        <li><Icon name="passport" size={16} /><span>{h?.title}</span></li>
        <li><Icon name="qr" size={16} /><span>Pașaport {a.gran}</span></li>
        <li><Icon name="doc" size={16} /><span><b>{a.docs.length} documente</b> de cerut fabricii: {a.docs.slice(0, 2).join(', ')}…</span></li>
      </ul>
      {!compact && <p className="hm2-role">{a.role}</p>}
      <div className="hm2-card-foot"><a className="btn primary" href={requestHref}>Cere datele fabricii <Icon name="arrowRight" size={15} /></a>{h && <a className="hm2-src" href={h.url} target="_blank" rel="noreferrer">{h.law}</a>}</div>
    </div>
  );
}

export function SupplierPhone({ q }: { q: CheckerPreset }) {
  const a = useAnswer(q);
  return (
    <div className="hm2-phone" lang="zh" aria-label="Formularul primit de fabrică, în chineză">
      <div className="hm2-phone-bar"><b>欧盟数字产品护照</b><span>供应商数据填写</span></div>
      <div className="hm2-phone-body">
        <span>您的欧盟客户请您提供以下资料：</span>
        {a.docs.slice(0, 3).map(d => <div key={d} className="hm2-pf"><Icon name="upload" size={12} />{d}</div>)}
        <div className="hm2-pbtn">开始填写</div>
      </div>
    </div>
  );
}

export function ProofStrip() {
  return (
    <div className="hm2-proof">
      <span><Icon name="check" size={15} />Registrul UE al pașapoartelor e activ din 20.07.2026</span>
      <span><Icon name="check" size={15} />Construit pe standardele EN 18216–18223, citate în Jurnalul Oficial</span>
      <span><Icon name="check" size={15} />Date găzduite în România</span>
    </div>
  );
}

/** H3 hero: copy + form on the left, answer card with the supplier phone on the right. */
export function HeroH3({ q, setQ, onVerify }: { q: CheckerPreset; setQ: (q: CheckerPreset) => void; onVerify?: () => void }) {
  return (
    <>
      <div className="hm2-split">
        <div><HeroCopy /><HeroForm q={q} setQ={setQ} onVerify={onVerify} /><a className="hm2-demo" href="#demo">Vezi un pașaport demo →</a></div>
        <div className="hm2-stack"><AnswerCard q={q} compact /><SupplierPhone q={q} /></div>
      </div>
      <ProofStrip />
    </>
  );
}
