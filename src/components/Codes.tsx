// QR codes (GS1 Digital Link) and linear barcodes (EAN-13, GS1-128 / EAN-14) rendered as SVG.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toSVG } from 'bwip-js/browser';

/** SVG markup for a QR code. Error correction H, quiet zone 4 modules. */
export async function qrSvg(text: string, opts: { sizeMm?: number; dark?: string; light?: string } = {}): Promise<string> {
  const svg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'H', margin: 4, color: { dark: opts.dark ?? '#000000', light: opts.light ?? '#ffffff' } });
  return opts.sizeMm ? svg.replace('<svg ', `<svg width="${opts.sizeMm}mm" height="${opts.sizeMm}mm" `) : svg;
}
export async function qrPng(text: string, px = 1024): Promise<Blob> {
  const url = await QRCode.toDataURL(text, { errorCorrectionLevel: 'H', margin: 4, width: px });
  return (await fetch(url)).blob();
}
/** Smallest print size in mm for a URL, so each module stays ≥ 0.33 mm (camera-safe). */
export function minPrintMm(text: string): number {
  const modules = QRCode.create(text, { errorCorrectionLevel: 'H' }).modules.size + 8;
  return Math.max(15, Math.ceil(modules * 0.33));
}

export function QrCode({ value, size = 140, title }: { value: string | null; size?: number; title?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { let live = true; if (value) qrSvg(value).then(s => live && setSvg(s)); else setSvg(''); return () => { live = false; }; }, [value]);
  if (!value) return <div style={{ width: size, height: size, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', border: '1px dashed var(--line-strong)', borderRadius: 8, color: 'var(--ink-3)', fontSize: 12, textAlign: 'center', padding: 8 }}>QR după un GTIN valid</div>;
  return <div title={title} style={{ width: size, height: size, background: '#fff', borderRadius: 8, padding: 0, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg width="${size}" height="${size}" `) }} />;
}

/** Linear barcode via bwip-js. bcid: 'ean13' | 'gs1-128' | 'ean14' | 'gs1datamatrix' | 'code128'. text uses GS1 (AI) syntax for GS1 codes. */
export function barcodeSvg(bcid: string, text: string, opts: { height?: number; scale?: number; includetext?: boolean } = {}): string | null {
  try {
    return toSVG({ bcid, text, height: opts.height ?? 12, scale: opts.scale ?? 2, includetext: opts.includetext ?? true, textxalign: 'center' });
  } catch { return null; }
}
export function Barcode({ bcid, text, height, width }: { bcid: string; text: string; height?: number; width?: number }) {
  const svg = barcodeSvg(bcid, text, { height: height ?? 12 });
  if (!svg) return <span className="small" style={{ color: 'var(--bad)' }}>Cod invalid</span>;
  return <div style={{ background: '#fff', padding: 6, borderRadius: 6, lineHeight: 0, width }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg style="width:100%;height:auto" ') }} />;
}
