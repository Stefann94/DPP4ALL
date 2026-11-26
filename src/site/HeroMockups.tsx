// /machete/hero — four hero layouts following the agreed plan:
// eyebrow + "Pașapoarte digitale pentru tot ce importați" + checker form + live answer card + proof strip.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { QrCode } from '../components/Codes';
import { SiteLayout } from './SiteLayout';
import { STATUS_LABEL, type CheckerPreset } from './Checker';
import { AnswerCard, HeroCopy, HeroForm, ProofStrip, SupplierPhone, fmtDate, useAnswer } from './HeroParts';

const fmt = fmtDate;
const Form = HeroForm;
const Proof = ProofStrip;
const Copy = HeroCopy;

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
          <div className="hm2-stack"><AnswerCard q={q} compact /><SupplierPhone q={q} /></div>
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
