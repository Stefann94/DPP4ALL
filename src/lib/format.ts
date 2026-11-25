// Romanian formatting helpers.
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const MONTHS_SHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const fmtNumber = (n: unknown, digits = 2) =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('ro-RO', { maximumFractionDigits: digits }) : String(n ?? '');

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fmtDate(iso)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function fmtMonth(ym?: string | null): string {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : ym;
}
/** "acum 5 min", "acum 3 zile", "în 84 de zile" */
export function fmtRelative(iso?: string | null, now = Date.now()): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const min = 60_000, h = 60 * min, d = 24 * h;
  let t: string;
  if (abs < min) return 'chiar acum';
  if (abs < h) t = `${Math.round(abs / min)} min`;
  else if (abs < d) t = `${Math.round(abs / h)} h`;
  else { const n = Math.round(abs / d); t = n === 1 ? 'o zi' : n < 20 ? `${n} zile` : `${n} de zile`; }
  return diff < 0 ? `acum ${t}` : `în ${t}`;
}
export const daysUntil = (iso: string, now = Date.now()) => Math.ceil((new Date(iso).getTime() - now) / 86_400_000);

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('ro-RO')} ${n === 1 ? one : (n % 100 >= 20 || n === 0 ? `de ${many}` : many)}`;
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]!.toUpperCase()).join('');
