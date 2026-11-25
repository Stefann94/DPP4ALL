// Small SVG chart kit (single-series, one validated hue: --chart). Hover crosshair + tooltip on series,
// direct value labels on bar lists, and a table view for every series chart.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '../styles/org.css';

export type Point = { key: string; label: string; value: number };

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => setW(Math.max(120, Math.round(e[0]!.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return n * p;
}

/** Area/line chart over time with crosshair tooltip. */
export function AreaChart({ data, height = 200, unit = 'scanări', compact = false }: { data: Point[]; height?: number; unit?: string; compact?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = compact ? 0 : 34, padR = compact ? 0 : 8, padT = compact ? 4 : 10, padB = compact ? 4 : 22;
  const max = niceMax(Math.max(1, ...data.map(d => d.value)));
  const iw = Math.max(10, width - padL - padR), ih = height - padT - padB;
  const x = (i: number) => padL + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
  const area = data.length ? `${line}L${x(data.length - 1).toFixed(1)},${padT + ih}L${x(0).toFixed(1)},${padT + ih}Z` : '';
  const ticks = compact ? [] : [0, max / 2, max];
  const xLabels = compact || data.length < 2 ? [] : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = data.length <= 1 ? 0 : Math.round(((px - padL) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`Grafic ${unit}`}>
        {ticks.map(t => <g key={t}><line className="grid" x1={padL} x2={padL + iw} y1={y(t)} y2={y(t)} /><text className="tick" x={padL - 6} y={y(t) + 4} textAnchor="end">{Math.round(t).toLocaleString('ro-RO')}</text></g>)}
        <path className="area" d={area} />
        <path className="line" d={line} />
        {xLabels.map((i, k) => <text key={i} className="tick" x={x(i)} y={height - 5} textAnchor={k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle'}>{data[i]!.label}</text>)}
        {h && hover !== null && <g><line className="cross" x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} /><circle className="dot" cx={x(hover)} cy={y(h.value)} r={4.5} /></g>}
        <rect x={0} y={0} width={width} height={height} fill="transparent" tabIndex={0} aria-label="Detalii la poziția cursorului"
          onPointerMove={onMove} onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(data.length - 1)} onBlur={() => setHover(null)}
          onKeyDown={e => { if (e.key === 'ArrowLeft') setHover(v => Math.max(0, (v ?? 0) - 1)); if (e.key === 'ArrowRight') setHover(v => Math.min(data.length - 1, (v ?? 0) + 1)); }} />
      </svg>
      {h && hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 50), width - 50), top: y(h.value) - 10 }}>
          <b>{h.value.toLocaleString('ro-RO')}</b><span className="k" />{h.label}
        </div>
      )}
      {!compact && (
        <details className="tableview"><summary>Tabel</summary>
          <div className="table-wrap" style={{ maxHeight: 220, overflow: 'auto' }}><table className="table"><thead><tr><th>Zi</th><th style={{ textAlign: 'right' }}>{unit}</th></tr></thead>
            <tbody>{data.map(d => <tr key={d.key}><td>{d.label}</td><td className="num" style={{ textAlign: 'right' }}>{d.value}</td></tr>)}</tbody></table></div>
        </details>
      )}
    </div>
  );
}

export const Sparkline = ({ data, height = 44 }: { data: Point[]; height?: number }) => <AreaChart data={data} height={height} compact />;

/** Horizontal magnitude bars with direct labels (no legend needed: one series). */
export function BarList({ items, total, empty = 'Fără date în perioada aleasă.' }: { items: { key: string; label: ReactNode; value: number; href?: string }[]; total?: number; empty?: string }) {
  const max = Math.max(1, ...items.map(i => i.value));
  const sum = total ?? items.reduce((a, b) => a + b.value, 0);
  if (!items.length) return <p className="faint small">{empty}</p>;
  return (
    <div className="barlist">
      {items.map(i => (
        <div className="b" key={i.key} title={`${typeof i.label === 'string' ? i.label : i.key}: ${i.value}`}>
          <span className="lab">{i.href ? <Link to={i.href}>{i.label}</Link> : i.label}</span>
          <div className="track"><div className="fillbar" style={{ width: `${(i.value / max) * 100}%` }} /></div>
          <span className="val">{i.value.toLocaleString('ro-RO')}<span className="pct">{sum ? Math.round((i.value / sum) * 100) : 0}%</span></span>
        </div>
      ))}
    </div>
  );
}

/** Bucket timestamps into daily points for the last `days` days (oldest → newest). */
export function dailySeries(dates: string[], days: number, end = new Date()): Point[] {
  const out: Point[] = [];
  const counts = new Map<string, number>();
  for (const d of dates) { const k = d.slice(0, 10); counts.set(k, (counts.get(k) ?? 0) + 1); }
  const MS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, label: `${d.getDate()} ${MS[d.getMonth()]}`, value: counts.get(key) ?? 0 });
  }
  return out;
}

export function useCountBy<T>(items: T[], keyOf: (t: T) => string | undefined, top = 8) {
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) { const k = keyOf(it); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, top]);
}
