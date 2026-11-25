// Browser file helpers (download, read, hash).

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const downloadText = (text: string, filename: string, mime = 'text/plain;charset=utf-8') =>
  downloadBlob(new Blob([text], { type: mime }), filename);
export const downloadJson = (obj: unknown, filename: string) =>
  downloadText(JSON.stringify(obj, null, 2), filename, 'application/json;charset=utf-8');
/** CSV with BOM so Excel opens UTF-8 (diacritics) correctly. */
export const downloadCsv = (csv: string, filename: string) => downloadText('﻿' + csv, filename, 'text/csv;charset=utf-8');

export const readAsDataUrl = (file: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(file);
});
export const readAsText = (file: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(file);
});
export const readAsArrayBuffer = (file: Blob) => new Promise<ArrayBuffer>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.onerror = () => rej(r.error); r.readAsArrayBuffer(file);
});

export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Stable JSON (sorted keys) so the same data always hashes the same. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().map(k => JSON.stringify(k) + ':' + canonicalJson((v as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(v ?? null);
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
