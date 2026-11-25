// Product mockups for the public site: hero flow (factory form → approval → public passport) and the demo passport phone.
import { useState } from 'react';
import { Icon } from '../components/ui';
import { QrCode } from '../components/Codes';

export function HeroFlow() {
  return (
    <div className="s-flow" aria-label="De la fabrică la pașaport">
      <div className="frame">
        <div className="phone"><div className="scr">
          <div className="bar zh" lang="zh"><b>欧盟数字产品护照</b><span>供应商数据填写</span></div>
          <div className="body zh" lang="zh">
            <div className="row2"><span>产品型号</span><div className="inp">EB-48V-14Ah</div></div>
            <div className="row2"><span>电池化学成分</span><div className="inp">NMC 811</div></div>
            <div className="row2"><span>额定容量</span><div className="inp">14 Ah</div></div>
            <div className="file"><Icon name="doc" size={12} />UN38.3 报告.pdf</div>
            <div className="file"><Icon name="doc" size={12} />IEC 62133.pdf</div>
            <div className="btnp">提交</div>
          </div>
        </div></div>
        <span className="cap"><b>1 · Fabrica</b>completează în chineză</span>
      </div>
      <div className="frame">
        <div className="phone"><div className="scr">
          <div className="bar"><b>Verificare</b><span>Baterie e-bike 48V</span></div>
          <div className="body">
            <div className="row2"><span>Completitudine</span><div className="meter"><i /></div><span className="ok">100% · gata de publicare</span></div>
            <div className="kv2"><span>Capacitate</span><b>14 Ah</b><span>Chimie</span><b>NMC 811</b><span>Masă</span><b>3,6 kg</b></div>
            <div className="file" style={{ borderStyle: 'solid', borderColor: '#b7e1d4', color: '#0f7a5f' }}><Icon name="check" size={12} />Raport UN38.3 verificat</div>
            <div className="file" style={{ borderStyle: 'solid', borderColor: '#b7e1d4', color: '#0f7a5f' }}><Icon name="check" size={12} />Câmpuri extrase din PDF</div>
            <div className="btnp">Aprobă și publică</div>
          </div>
        </div></div>
        <span className="cap"><b>2 · Voi</b>verificați și aprobați</span>
      </div>
      <div className="frame">
        <div className="phone"><div className="scr">
          <div className="bar"><b>Pașaportul bateriei</b><span>Voltaria Ride 48V 14Ah</span></div>
          <div className="body">
            <div className="kv2"><span>Producător</span><b>Shenzhen Cell Co.</b><span>Importator</span><b>SC Exemplu SRL</b><span>Status</span><b>Originală</b><span>Reciclare</span><b>Punct de colectare</b></div>
            <div className="lock"><Icon name="lock" size={12} />Compoziție detaliată <span className="tierchip r">Interes legitim</span></div>
            <div className="lock"><Icon name="lock" size={12} />Rapoarte de test <span className="tierchip a">Autorități</span></div>
          </div>
        </div></div>
        <span className="cap"><b>3 · Clientul</b>scanează QR-ul de pe cutie</span>
      </div>
    </div>
  );
}

type Tier = 'public' | 'restricted' | 'authority';
const DEMOS: Record<string, { name: string; sub: string; rows: [string, string, Tier][] }> = {
  baterie: { name: 'Baterie e-bike 48V 14Ah', sub: 'Pașaport per bucată · serie SN-000187', rows: [
    ['Producător', 'Shenzhen Cell Co., CN', 'public'], ['Importator', 'SC Exemplu SRL, RO', 'public'], ['Chimie', 'Litiu-ion NMC 811', 'public'], ['Capacitate', '14 Ah · 48 V', 'public'],
    ['Amprentă de carbon', '68 kg CO₂e/kWh', 'public'], ['Stare (SoH)', '96%', 'restricted'], ['Compoziție catod/anod', 'NMC 811 / grafit', 'restricted'], ['Manual de demontare', 'PDF', 'restricted'], ['Rapoarte de test', 'UN38.3, IEC 62133', 'authority']] },
  jucarie: { name: 'Mașinuță cu telecomandă', sub: 'Pașaportul jucăriei · lot L2611', rows: [
    ['Producător', 'Shantou Toys Ltd., CN', 'public'], ['Importator', 'SC Exemplu SRL, RO', 'public'], ['Vârstă', '3+', 'public'], ['Avertismente', 'Conține piese mici', 'public'],
    ['Conformitate', 'EN 71-1, -2, -3', 'public'], ['Substanțe chimice', 'Lista completă', 'restricted'], ['Rapoarte de test', 'EN 71 (laborator acreditat)', 'authority']] },
  tricou: { name: 'Tricou bumbac organic', sub: 'Pașaport textil · model T-200', rows: [
    ['Producător', 'Ningbo Textile Co., CN', 'public'], ['Compoziție', '100% bumbac organic', 'public'], ['Întreținere', 'Spălare 30 °C', 'public'], ['Țara de confecționare', 'China', 'public'],
    ['Origine fibre', 'India', 'public'], ['Furnizori pe etape', '3 fabrici', 'restricted'], ['Teste REACH', 'Azo, PFAS', 'authority']] },
  trotineta: { name: 'Trotinetă electrică 350 W', sub: 'Produs + baterie LMT', rows: [
    ['Producător', 'Ningbo Mobility Co., CN', 'public'], ['Importator', 'SC Exemplu SRL, RO', 'public'], ['Baterie', '36 V · 10 Ah (LMT)', 'public'], ['Viteză max.', '25 km/h', 'public'],
    ['Piese de schimb', 'Listă și surse', 'restricted'], ['Istoric baterie', 'Cicluri, evenimente', 'restricted'], ['Declarație + teste', 'EN 17128, CE', 'authority']] },
};
const RANK: Record<Tier, number> = { public: 0, restricted: 1, authority: 2 };

export function DemoPassport() {
  const [p, setP] = useState<keyof typeof DEMOS>('baterie');
  const [as, setAs] = useState<Tier>('public');
  const d = DEMOS[p]!;
  const demoUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/pp_homecell10` : null;
  return (
    <div className="s-demo">
      <div className="stack lg">
        <div className="stack sm">
          <b>Produs</b>
          <div className="chips">{(Object.keys(DEMOS) as (keyof typeof DEMOS)[]).map(k => <button key={k} className={'chip' + (p === k ? ' on' : '')} onClick={() => setP(k)}>{DEMOS[k]!.name}</button>)}</div>
        </div>
        <div className="stack sm">
          <b>Vezi ca</b>
          <div className="seg" style={{ flexWrap: 'wrap' }}>
            <button aria-pressed={as === 'public'} onClick={() => setAs('public')}>Consumator</button>
            <button aria-pressed={as === 'restricted'} onClick={() => setAs('restricted')}>Reparator / reciclator</button>
            <button aria-pressed={as === 'authority'} onClick={() => setAs('authority')}>Autoritate</button>
          </div>
          <p className="muted small">Câmpurile se deschid pe niveluri, ca în Anexa XIII a Regulamentului bateriilor.</p>
        </div>
        <div className="row" style={{ alignItems: 'center', gap: 14 }}>
          <QrCode value={demoUrl} size={104} />
          <div className="stack sm"><b>Scanați cu telefonul</b><span className="muted small">Pașaport demo real, cu date inventate.</span><a href="/p/pp_homecell10" target="_blank" rel="noreferrer">Deschide pașaportul demo →</a></div>
        </div>
      </div>
      <div className="phone auto"><div className="scr">
        <div className="bar"><b>{d.name}</b><span>{d.sub}</span></div>
        <div className="body" style={{ gap: 6 }}>
          {d.rows.map(([k, v, t]) => RANK[t] <= RANK[as]
            ? <div key={k} className="kv2" style={{ gridTemplateColumns: '1fr auto', borderBottom: '1px solid #edf1f3', paddingBottom: 4 }}><span>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>
            : <div key={k} className="lock" style={{ borderBottom: '1px solid #edf1f3', paddingBottom: 4 }}><Icon name="lock" size={11} />{k}<span className={'tierchip ' + (t === 'restricted' ? 'r' : 'a')} style={{ marginLeft: 'auto' }}>{t === 'restricted' ? 'Interes legitim' : 'Autorități'}</span></div>)}
        </div>
      </div></div>
    </div>
  );
}
