// Shared scan analytics view (whole org or one passport).
import { useMemo, useState } from 'react';
import { useDB } from '../api/store';
import { Empty, Icon, Segmented } from '../components/ui';
import { downloadCsv } from '../lib/download';
import { AreaChart, BarList, dailySeries } from './_charts';
import { COUNTRY, DEVICE, LANG, toCsv } from './_org';
import type { ScanEvent } from '../types';

const DAY = 86_400_000;
const countBy = (items: ScanEvent[], key: (s: ScanEvent) => string | undefined, top = 8) => {
  const m = new Map<string, number>();
  for (const s of items) { const k = key(s); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
};

export function ScanStats({ passportId }: { passportId?: string }) {
  const all = useDB(d => d.scans);
  const passports = useDB(d => d.passports);
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const days = Number(range);
  const now = Date.now();
  const scans = useMemo(() => all.filter(s => (!passportId || s.passportId === passportId) && now - new Date(s.at).getTime() < days * DAY), [all, passportId, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => all.filter(s => { const a = now - new Date(s.at).getTime(); return (!passportId || s.passportId === passportId) && a >= days * DAY && a < 2 * days * DAY; }).length, [all, passportId, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = useMemo(() => dailySeries(scans.map(s => s.at), days), [scans, days]);
  const pName = (id: string) => passports.find(p => p.id === id)?.name ?? id;
  const countries = countBy(scans, s => s.country);
  const devices = countBy(scans, s => s.device);
  const langs = countBy(scans, s => s.language);
  const topP = countBy(scans, s => s.passportId, 6);
  const topU = countBy(scans, s => s.unitSerial, 6);
  const mobile = scans.length ? Math.round((scans.filter(s => s.device === 'mobile').length / scans.length) * 100) : 0;
  const delta = prev ? Math.round(((scans.length - prev) / prev) * 100) : null;
  const unitScans = scans.filter(s => s.unitSerial).length;

  const exportCsv = () => downloadCsv(toCsv([['data', 'pasaport', 'baterie', 'tara', 'dispozitiv', 'limba'], ...scans.map(s => [s.at, pName(s.passportId), s.unitSerial ?? '', s.country, s.device, s.language])]), `scanari-${range}-zile.csv`);

  return (
    <div className="stack lg">
      <div className="row between">
        <Segmented value={range} onChange={setRange} items={[{ value: '7', label: '7 zile' }, { value: '30', label: '30 zile' }, { value: '90', label: '90 zile' }]} />
        <button className="btn sm" onClick={exportCsv} disabled={!scans.length}><Icon name="download" />CSV</button>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="l">Scanări</span><span className="v">{scans.length.toLocaleString('ro-RO')}</span><span className={'d' + (delta === null ? '' : delta >= 0 ? ' up' : ' down')}>{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta}% față de perioada anterioară`}</span></div>
        <div className="kpi"><span className="l">{passportId ? 'Pe baterii individuale' : 'Pașapoarte scanate'}</span><span className="v">{passportId ? unitScans : new Set(scans.map(s => s.passportId)).size}</span><span className="d">{passportId ? 'coduri cu serie' : 'modele distincte'}</span></div>
        <div className="kpi"><span className="l">Țări</span><span className="v">{new Set(scans.map(s => s.country)).size}</span><span className="d">{countries[0] ? `cele mai multe din ${COUNTRY[countries[0][0]] ?? countries[0][0]}` : '—'}</span></div>
        <div className="kpi"><span className="l">De pe telefon</span><span className="v">{mobile}%</span><span className="d">scanare cu camera</span></div>
      </div>
      {scans.length === 0 ? <div className="card"><Empty icon="qr" title="Nicio scanare în perioada aleasă">Scanările apar după ce publici pașaportul și tipărești codul QR.</Empty></div> : <>
        <section className="card"><div className="card-head"><h3>Scanări pe zi</h3></div><AreaChart data={series} height={220} /></section>
        <div className="grid-2">
          <section className="card"><div className="card-head"><h3>Țări</h3></div><BarList items={countries.map(([k, v]) => ({ key: k, label: COUNTRY[k] ?? k, value: v }))} total={scans.length} /></section>
          <section className="card"><div className="card-head"><h3>Dispozitive</h3></div><BarList items={devices.map(([k, v]) => ({ key: k, label: DEVICE[k] ?? k, value: v }))} total={scans.length} /></section>
          <section className="card"><div className="card-head"><h3>Limba paginii</h3></div><BarList items={langs.map(([k, v]) => ({ key: k, label: LANG[k] ?? k, value: v }))} total={scans.length} /></section>
          {!passportId
            ? <section className="card"><div className="card-head"><h3>Top pașapoarte</h3></div><BarList items={topP.map(([k, v]) => ({ key: k, label: pName(k), value: v, href: `/pasapoarte/${k}/statistici` }))} total={scans.length} /></section>
            : <section className="card"><div className="card-head"><h3>Top baterii</h3></div><BarList items={topU.map(([k, v]) => ({ key: k, label: <span className="mono">{k}</span>, value: v }))} total={unitScans} empty="Nicio scanare pe cod de baterie." /></section>}
          {!passportId && <section className="card"><div className="card-head"><h3>Top baterii</h3></div><BarList items={topU.map(([k, v]) => ({ key: k, label: <span className="mono">{k}</span>, value: v }))} total={unitScans} empty="Nicio scanare pe cod de baterie." /></section>}
        </div>
      </>}
    </div>
  );
}
