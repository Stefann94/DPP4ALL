// Deadlines per category, 2024–2031. Solid dot = adopted law, dashed = indicative Commission date.
// Labels are packed into lanes above/below the axis so close dates never overlap.
import { useMemo, useState } from 'react';
import { CATEGORIES, TIMELINE } from '../data/regulations';

const START = new Date('2024-06-01').getTime();
const END = new Date('2031-01-01').getTime();
const pos = (iso: string) => ((new Date(iso).getTime() - START) / (END - START)) * 100;
const LANE_H = 66;         // vertical step between lanes (labels are up to ~4 lines)
const AXIS = 3 * LANE_H + 24; // px from top of the drawing
const MIN_GAP = 12.5;      // % of width two labels in the same lane must keep apart
const LANES = [[-1, 1], [1, 1], [-1, 2], [1, 2], [-1, 3], [1, 3]] as const; // [side, level]

export function Timeline() {
  const [filter, setFilter] = useState<string>('toate');
  const [sel, setSel] = useState<number>(5);
  const cats = useMemo(() => ['toate', ...new Set(TIMELINE.map(t => t.cat))], []);
  const today = new Date().toISOString().slice(0, 10);
  const name = (id: string) => (id === 'toate' ? 'Toate' : CATEGORIES.find(c => c.id === id)?.name ?? id);

  const placed = useMemo(() => {
    const last: number[] = LANES.map(() => -Infinity);
    return TIMELINE.map(t => {
      const x = pos(t.date);
      let li = LANES.findIndex((_, i) => x - last[i]! >= MIN_GAP);
      if (li < 0) li = LANES.length - 1;
      last[li] = x;
      const [side, level] = LANES[li]!;
      const top = side < 0 ? AXIS - 16 - level * LANE_H : AXIS + 30 + (level - 1) * LANE_H;
      return { ...t, x, side, top };
    });
  }, []);
  const height = AXIS + 30 + 3 * LANE_H;
  const s = TIMELINE[sel]!;
  const sCat = CATEGORIES.find(c => c.id === s.cat);
  const sOb = sCat?.obligations.find(o => o.date === s.date) ?? sCat?.obligations.find(o => o.status === (s.firm ? 'adopted' : 'indicative'));
  const lbl = (t: { firm: boolean; date: string }) => (t.firm ? t.date.split('-').reverse().join('.') : '~' + t.date.slice(0, 4));

  return (
    <div>
      <div className="s-tl-filters" role="group" aria-label="Filtru categorie">
        {cats.map(c => <button key={c} className={'chip' + (filter === c ? ' on' : '')} onClick={() => setFilter(c)}>{name(c)}</button>)}
      </div>
      <div className="s-tl">
        <div className="s-tl-inner" style={{ height }}>
          <div className="s-tl-axis" style={{ top: AXIS }} />
          {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
            <div key={y}><div className="s-tl-tick" style={{ left: `${pos(`${y}-01-01`)}%`, top: AXIS - 6 }} /><div className="s-tl-year" style={{ left: `${pos(`${y}-01-01`)}%`, top: AXIS + 8 }}>{y}</div></div>
          ))}
          <div className="s-tl-today" style={{ left: `${pos(today)}%`, top: 14, bottom: 10 }}><span>Azi</span></div>
          {placed.map((t, i) => {
            const dim = filter !== 'toate' && t.cat !== filter;
            const lineTop = t.side < 0 ? t.top + 30 : AXIS;
            const lineH = t.side < 0 ? AXIS - (t.top + 30) : t.top - AXIS;
            return (
              <div key={t.label} style={{ opacity: dim ? 0.22 : 1 }}>
                <div aria-hidden="true" style={{ position: 'absolute', left: `${t.x}%`, top: lineTop, height: lineH, borderLeft: `1px ${t.firm ? 'solid' : 'dashed'} var(--line-strong)` }} />
                <span aria-hidden="true" className={'s-tl-dotabs' + (t.firm ? '' : ' ind') + (sel === i ? ' on' : '')} style={{ left: `${t.x}%`, top: AXIS }} />
                <button className={'s-tl-pt' + (t.firm ? '' : ' ind')} style={{ left: `${t.x}%`, top: t.top }} onClick={() => setSel(i)} aria-pressed={sel === i} aria-label={`${t.label}, ${t.firm ? 'lege adoptată' : 'indicativ'}`}>
                  <span className={'lbl' + (sel === i ? ' on' : '')}><b>{lbl(t)}</b>{t.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="s-tl-legend"><span><i />Lege adoptată (dată fermă)</span><span><i className="dash" />Indicativ: act delegat neadoptat</span></div>
      <div className="s-card" style={{ marginTop: 18 }}>
        <div className="row between"><b style={{ fontFamily: 'var(--fh)', fontSize: 17 }}>{s.label}</b><span className={'stag ' + (s.firm ? 'adopted' : 'indicative')}>{s.firm ? 'Lege adoptată · ' + lbl(s) : 'Indicativ · ' + lbl(s)}</span></div>
        {sOb ? <p>{sOb.detail} <a href={sOb.url} target="_blank" rel="noreferrer">{sOb.law}</a></p> : <p>Infrastructură comună pentru toate categoriile: registrul UE în care se înregistrează pașapoartele.</p>}
      </div>
    </div>
  );
}
