// GTIN / EAN-14 / GS1 Digital Link helpers.

export function checkDigit(body: string): number {
  let sum = 0;
  [...body].reverse().forEach((d, i) => { sum += Number(d) * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10;
}

export type GtinCheck = { ok: true; gtin14: string } | { ok: false; message: string; suggestion?: string };

/** Placeholder numbers from documentation that must never be published. */
const EXAMPLES = new Set(['09506000134376', '04006381333931', '00000000000000']);

export function checkGtin(input: unknown): GtinCheck | null {
  const g = String(input ?? '').trim();
  if (!g) return null;
  if (!/^\d+$/.test(g)) return { ok: false, message: 'GTIN conține doar cifre.' };
  if (![8, 12, 13, 14].includes(g.length)) return { ok: false, message: 'GTIN are 8, 12, 13 sau 14 cifre.' };
  const want = checkDigit(g.slice(0, -1));
  if (want !== Number(g.at(-1))) return { ok: false, message: `Cifra de control e greșită.`, suggestion: g.slice(0, -1) + want };
  const g14 = g.padStart(14, '0');
  if (EXAMPLES.has(g14)) return { ok: false, message: 'Acesta e un număr de exemplu, nu un cod real primit de la GS1.' };
  return { ok: true, gtin14: g14 };
}

export const toGtin14 = (g: string) => { const c = checkGtin(g); return c && c.ok ? c.gtin14 : null; };

/** EAN-14 for a packaging level: indicator (1–8) + first 12 digits of the GTIN-13 + new check digit. */
export function makeEan14(gtin13: string, indicator: number): string | null {
  const c = checkGtin(gtin13);
  if (!c || !c.ok || gtin13.length !== 13 || indicator < 0 || indicator > 9) return null;
  const body = String(indicator) + gtin13.slice(0, 12);
  return body + checkDigit(body);
}

/** GS1 AI 21 serial: 1–20 chars from the GS1 AI encodable set 82. */
export const SERIAL_RE = /^[A-Za-z0-9!"%&'()*+,\-./:;<=>?_]{1,20}$/;

export function digitalLink(resolver: string, gtin: string | null | undefined, opts: { serial?: string; batch?: string } = {}): string | null {
  const g14 = gtin ? toGtin14(gtin) : null;
  const base = (resolver || '').trim().replace(/\/+$/, '');
  if (!g14 || !/^https?:\/\/[^/]+/i.test(base)) return null;
  let url = `${base}/01/${g14}`;
  if (opts.batch) url += `/10/${encodeURIComponent(opts.batch)}`;
  if (opts.serial) url += `/21/${encodeURIComponent(opts.serial)}`;
  return url;
}

/** GS1 element string for GS1-128 / DataMatrix: (01)GTIN(10)lot(21)serial. */
export function elementString(gtin: string, opts: { serial?: string; batch?: string } = {}): string | null {
  const g14 = toGtin14(gtin);
  if (!g14) return null;
  let s = `(01)${g14}`;
  if (opts.batch) s += `(10)${opts.batch}`;
  if (opts.serial) s += `(21)${opts.serial}`;
  return s;
}

/** Parse a Digital Link path like /01/05949876543219/21/ABC into its parts. */
export function parseDigitalLinkPath(path: string): { gtin14: string; serial?: string; batch?: string } | null {
  const m = path.match(/\/01\/(\d{8,14})(?:\/10\/([^/]+))?(?:\/21\/([^/?#]+))?/);
  if (!m) return null;
  return { gtin14: m[1].padStart(14, '0'), batch: m[2] ? decodeURIComponent(m[2]) : undefined, serial: m[3] ? decodeURIComponent(m[3]) : undefined };
}
