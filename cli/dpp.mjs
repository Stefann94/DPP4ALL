#!/usr/bin/env node
// dpp — script pentru pașapoartele digitale ale bateriilor.
// Transformă fișiere Excel/CSV în JSON-ul de import al platformei, le verifică,
// urmărește un folder și (când backend-ul e gata) le trimite prin API.
//
//   node cli/dpp.mjs template [--all] [--out sablon.xlsx|.csv]
//   node cli/dpp.mjs validate <fisier.xlsx|csv>
//   node cli/dpp.mjs convert  <fisier.xlsx|csv> [--out pasapoarte.json]
//   node cli/dpp.mjs watch    <folder> [--out <folder-procesate>]
//   node cli/dpp.mjs push     <fisier.xlsx|csv|json> --api https://… --key dpp_live_… [--dry-run]
//
// Folosește doar pachetele deja instalate în proiect (xlsx, papaparse). Node 18+.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'src', 'data', 'fields.json'), 'utf8'));
const FIELDS = CATALOG.fields.filter(f => f.section !== 'unitate');
const FIELD = Object.fromEntries(FIELDS.map(f => [f.name, f]));
const SECTION_ORDER = CATALOG.sections.map(s => s.id);
const FULL = ['ev', 'lmt', 'industrial_stationary', 'industrial_other'];
const CATEGORY_LABELS = {
  industrial_stationary: ['Stocare staționară > 2 kWh', 'Staționară'], industrial_other: ['Industrială > 2 kWh', 'Industrială'],
  ev: ['Vehicul electric (EV)', 'EV'], lmt: ['Transport ușor (LMT)', 'LMT'], portable: ['Portabilă'], sli: ['Pornire auto (SLI)', 'SLI'],
  industrial_up_to_2kwh: ['Industrială ≤ 2 kWh', 'Ind. ≤ 2 kWh'],
};
const TODAY = new Date().toISOString().slice(0, 10);

// ───────────── utilitare ─────────────
const c = { red: s => `\x1b[31m${s}\x1b[0m`, green: s => `\x1b[32m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m` };
const die = (msg, code = 2) => { console.error(c.red('Eroare: ') + msg); process.exit(code); };

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const next = argv[i + 1]; if (next && !next.startsWith('--')) { out[k] = next; i++; } else out[k] = true; }
    else out._.push(a);
  }
  return out;
}

/** Cheie de potrivire: fără diacritice, litere mici, camelCase → snake, fără * final. */
const norm = s => String(s ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim().replace(/\*+$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const INDEX = new Map();
for (const f of FIELDS) for (const k of [f.name, f.label_ro, f.label, f.source_name]) { const n = k ? norm(k) : ''; if (n && !INDEX.has(n)) INDEX.set(n, f.name); }
for (const [a, f] of Object.entries({ nume: 'product_name', denumire: 'product_name', produs: 'product_name', ean: 'gtin', ean13: 'gtin', categorie: 'battery_category', model: 'battery_model_identifier' })) if (!INDEX.has(a)) INDEX.set(a, f);

function autoMap(headers) { const used = new Set(); return headers.map(h => { const m = INDEX.get(norm(h)) ?? ''; if (!m || used.has(m)) return ''; used.add(m); return m; }); }

// ───────────── citire fișiere ─────────────
function cell(v) {
  if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (typeof v === 'boolean') return v ? 'da' : 'nu';
  return String(v ?? '').trim();
}
function readTable(file) {
  const ext = path.extname(file).toLowerCase();
  if (['.xlsx', '.xlsm', '.xls', '.ods'].includes(ext)) {
    const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }).map(r => r.map(cell)).filter(r => r.some(x => x !== ''));
  }
  if (ext === '.csv' || ext === '.txt') {
    const text = fs.readFileSync(file, 'utf8').replace(/^\ufeff/, '');
    return Papa.parse(text, { skipEmptyLines: 'greedy' }).data.map(r => r.map(x => String(x ?? '').trim()));
  }
  die(`Format nesuportat: ${ext} (folosește .xlsx, .xls, .ods sau .csv)`);
}

/** Antetul = rândul (din primele 10) cu cele mai multe coloane recunoscute; sare peste rândul de etichete. */
function detectHeader(rows) {
  let best = 0, score = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) { const s = autoMap(rows[i]).filter(Boolean).length; if (s > score) { score = s; best = i; } }
  const map = autoMap(rows[best] ?? []);
  const next = rows[best + 1] ?? [];
  const mapped = map.map((f, i) => [f, i]).filter(([f]) => f);
  const hits = mapped.filter(([f, i]) => next[i] && norm(next[i]) === norm(FIELD[f].label_ro)).length;
  return { header: best, map, skip: mapped.length > 0 && hits >= mapped.length / 2 ? 1 : 0 };
}

// ───────────── conversie valori ─────────────
function checkDigit(body) { let s = 0; [...body].reverse().forEach((d, i) => { s += Number(d) * (i % 2 === 0 ? 3 : 1); }); return (10 - (s % 10)) % 10; }
function gtinError(g) {
  if (!/^\d+$/.test(g)) return 'GTIN conține doar cifre';
  if (![8, 12, 13, 14].includes(g.length)) return 'GTIN are 8, 12, 13 sau 14 cifre';
  const want = checkDigit(g.slice(0, -1));
  return want === Number(g.at(-1)) ? null : `cifra de control greșită (poate ${g.slice(0, -1)}${want}?)`;
}
function parseNumber(raw) {
  let s = raw.replace(/[\s\u00a0]/g, '').replace(/[^\d,.\-+eE]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
function parseMonth(raw) {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{4})$/); if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = s.match(/^\d{1,2}[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  return null;
}
function options(f) {
  if (f.name === 'battery_category') return Object.entries(CATEGORY_LABELS).map(([value, labels]) => ({ value, labels }));
  const opts = f.options ?? (f.options_by_profile ? [...f.options_by_profile.battery_full, ...f.options_by_profile.battery_basic] : []);
  return opts.map(o => ({ value: o.value, labels: [o.label] }));
}
function matchOption(f, raw) { const n = norm(raw); return options(f).find(o => o.value === raw || norm(o.value) === n || o.labels.some(l => norm(l) === n))?.value ?? null; }

/** Valoarea din celulă → valoarea stocată; întoarce { value } sau { error }. */
function coerce(f, raw) {
  const s = String(raw ?? '').trim();
  if (!s) return {};
  switch (f.type) {
    case 'number': { const n = parseNumber(s); if (n === null) return { error: `„${s}” nu e număr` }; if (f.min !== undefined && n < f.min) return { error: `minim ${f.min}` }; if (f.max !== undefined && n > f.max) return { error: `maxim ${f.max}` }; return { value: n }; }
    case 'pictogram': { const k = norm(s); if (['da', 'yes', 'true', '1', 'x'].includes(k)) return { value: true }; if (['nu', 'no', 'false', '0'].includes(k)) return { value: false }; return { error: `„${s}”: da / nu` }; }
    case 'select': { const v = matchOption(f, s); return v ? { value: v } : { error: `„${s}” nu e opțiune validă` }; }
    case 'multiselect': { const vals = []; for (const p of s.split(/[;|]/).map(x => x.trim()).filter(Boolean)) { const v = matchOption(f, p); if (!v) return { error: `„${p}” nu e opțiune validă` }; vals.push(v); } return { value: [...new Set(vals)] }; }
    case 'array': return { value: s.split(/[;|\n]/).map(x => x.trim()).filter(Boolean) };
    case 'month': { const m = parseMonth(s); return m ? { value: m } : { error: `„${s}”: lună invalidă (AAAA-LL)` }; }
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(s) ? { value: s } : { error: `„${s}”: dată invalidă` };
    case 'url': return /^https?:\/\/\S+$/i.test(s) ? { value: s } : { error: 'link complet cu https://' };
  }
  if (f.name === 'gtin') { const g = s.replace(/\s+/g, ''); const e = gtinError(g); return e ? { error: e } : { value: g }; }
  if (/_country$/.test(f.name)) { const v = s.toUpperCase(); return /^[A-Z]{2}$/.test(v) ? { value: v } : { error: 'cod de țară din 2 litere' }; }
  if (f.name === 'eori_number') { const v = s.toUpperCase(); return /^[A-Z]{2}[A-Z0-9]{1,15}$/.test(v) ? { value: v } : { error: 'EORI invalid' }; }
  if (f.name === 'manufacturer_email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { value: s } : { error: 'e-mail invalid' };
  return { value: s };
}

/** Câmpurile obligatorii azi pentru categoria dată (respectă profilul, required_when și required_from). */
function requiredFields(category) {
  const profile = category && !FULL.includes(category) ? 'battery_basic' : 'battery_full';
  return FIELDS.filter(f => {
    if (f.name === 'battery_category' || !f.profiles.includes(profile)) return false;
    if (f.required_when && category && !f.required_when.one_of.includes(category)) return false;
    const r = profile === 'battery_basic' && f.requirement_basic ? f.requirement_basic : f.requirement;
    return r === 'required' && !(f.required_from && f.required_from > TODAY);
  });
}

// ───────────── conversie fișier ─────────────
/** Citește un fișier și întoarce pașapoartele + problemele găsite (pe rând). */
function convertFile(file) {
  const rows = readTable(file);
  if (!rows.length) return { passports: [], problems: [{ line: 0, field: '', level: 'error', message: 'Fișier gol' }], unmatched: [] };
  const { header, map, skip } = detectHeader(rows);
  const headers = rows[header];
  const unmatched = headers.filter((h, i) => h && !map[i]);
  const problems = [];
  const passports = [];
  const first = header + 1 + skip;
  const seen = new Map();
  rows.slice(first).forEach((row, i) => {
    const line = first + i + 1;
    const data = {};
    map.forEach((name, col) => {
      if (!name) return;
      const f = FIELD[name];
      const r = coerce(f, row[col]);
      if (r.error) problems.push({ line, field: f.label_ro, level: 'error', message: r.error });
      else if (r.value !== undefined) { (data[f.section] ??= {})[f.name] = r.value; }
    });
    const name = String(data.identificare?.product_name ?? '').trim();
    const category = data.identificare?.battery_category ?? null;
    if (!name) problems.push({ line, field: 'Denumire', level: 'error', message: 'lipsește denumirea produsului' });
    if (!category) problems.push({ line, field: 'Categorie', level: 'error', message: 'lipsește categoria bateriei' });
    for (const f of requiredFields(category)) {
      const v = data[f.section]?.[f.name];
      if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) problems.push({ line, field: f.label_ro, level: 'warn', message: 'obligatoriu pentru publicare' });
    }
    const gtin = data.identificare?.gtin;
    if (gtin) { if (seen.has(gtin)) problems.push({ line, field: 'GTIN', level: 'error', message: `duplicat (rândul ${seen.get(gtin)})` }); else seen.set(gtin, line); }
    // ordinea secțiunilor ca în catalog
    const ordered = Object.fromEntries(SECTION_ORDER.filter(s => data[s]).map(s => [s, data[s]]));
    passports.push({ name, category, data: ordered, _line: line });
  });
  return { passports, problems, unmatched };
}

function printReport(file, res) {
  const errors = res.problems.filter(p => p.level === 'error');
  const warns = res.problems.filter(p => p.level === 'warn');
  console.log(c.bold(path.basename(file)) + c.dim(` · ${res.passports.length} rânduri`));
  if (res.unmatched.length) console.log(c.yellow('Coloane nerecunoscute (ignorate): ') + res.unmatched.join(', '));
  if (errors.length) {
    console.log(c.red(`\n${errors.length} erori:`));
    console.table(errors.slice(0, 200).map(p => ({ rând: p.line, câmp: p.field, problemă: p.message })));
  }
  if (warns.length) {
    const byLine = {};
    for (const w of warns) (byLine[w.line] ??= []).push(w.field);
    console.log(c.yellow(`\n${warns.length} câmpuri obligatorii lipsă (rândurile se importă ca ciornă):`));
    for (const [line, fields] of Object.entries(byLine).slice(0, 50)) console.log(c.dim(`  rândul ${line}: `) + fields.slice(0, 6).join(', ') + (fields.length > 6 ? ` +${fields.length - 6}` : ''));
  }
  if (!errors.length) console.log(c.green(`\n✓ Fără erori`) + (warns.length ? c.dim(' (doar câmpuri lipsă)') : ''));
  return errors.length;
}

const importJson = passports => ({ format: 'dpp-platform-import', version: 1, generatedAt: new Date().toISOString(), passports: passports.map(({ _line, ...p }) => p) });

// ───────────── comenzi ─────────────
function cmdTemplate(args) {
  const all = !!args.all;
  const out = args.out || (all ? 'sablon-pasapoarte-complet.xlsx' : 'sablon-pasapoarte.xlsx');
  const lead = ['product_name', 'gtin', 'battery_category', 'battery_model_identifier'];
  let cols = FIELDS.filter(f => all || f.requirement === 'required' || f.requirement_basic === 'required' || lead.includes(f.name));
  cols = [...lead.map(n => FIELD[n]), ...cols.filter(f => !lead.includes(f.name))];
  const names = cols.map(f => (f.requirement === 'required' || f.name === 'product_name' ? f.name + '*' : f.name));
  if (out.toLowerCase().endsWith('.csv')) {
    fs.writeFileSync(out, '\ufeff' + Papa.unparse([names]));
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([names, cols.map(f => f.label_ro)]);
    ws['!cols'] = names.map(n => ({ wch: Math.min(40, Math.max(12, n.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Pasapoarte');
    const ref = [['camp', 'eticheta', 'tip', 'unitate', 'obligatoriu', 'optiuni'], ...cols.map(f => [f.name, f.label_ro, f.type, f.unit ?? '', f.requirement === 'required' ? (f.required_from ? `din ${f.required_from}` : 'da') : '', options(f).map(o => o.value).join('; ')])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ref), 'Campuri');
    fs.writeFileSync(out, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
  console.log(c.green('✓ ') + `${out} · ${cols.length} coloane (* = obligatoriu)`);
}

function cmdValidate(args) {
  const file = args._[1] || die('Lipsește fișierul: node cli/dpp.mjs validate produse.xlsx');
  if (!fs.existsSync(file)) die(`Nu găsesc ${file}`);
  const errors = printReport(file, convertFile(file));
  process.exit(errors ? 1 : 0);
}

function cmdConvert(args) {
  const file = args._[1] || die('Lipsește fișierul: node cli/dpp.mjs convert produse.xlsx --out pasapoarte.json');
  if (!fs.existsSync(file)) die(`Nu găsesc ${file}`);
  const res = convertFile(file);
  const errors = printReport(file, res);
  const out = args.out || file.replace(/\.[^.]+$/, '') + '.json';
  if (errors && !args.force) { console.log(c.red('\nNu am scris JSON-ul. Corectează erorile sau folosește --force (rândurile cu erori se exclud).')); process.exit(1); }
  const badLines = new Set(res.problems.filter(p => p.level === 'error').map(p => p.line));
  const ok = res.passports.filter(p => !badLines.has(p._line));
  fs.writeFileSync(out, JSON.stringify(importJson(ok), null, 2));
  console.log(c.green('✓ ') + `${out} · ${ok.length} pașapoarte` + (badLines.size ? c.yellow(` · ${badLines.size} rânduri excluse`) : ''));
  console.log(c.dim('  Încarcă fișierul în platformă: Import → Pașapoarte.'));
}

function cmdWatch(args) {
  const dir = args._[1] || die('Lipsește folderul: node cli/dpp.mjs watch D:\\DPP\\intrare');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) die(`${dir} nu e un folder`);
  const done = path.resolve(args.out || path.join(dir, 'procesate'));
  const errDir = path.resolve(args.errors || path.join(dir, 'erori'));
  fs.mkdirSync(done, { recursive: true }); fs.mkdirSync(errDir, { recursive: true });
  const busy = new Set();
  const handle = async name => {
    const file = path.join(dir, name);
    if (busy.has(file) || !/\.(csv|xlsx|xls|ods)$/i.test(name) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return;
    busy.add(file);
    try {
      // așteaptă până fișierul nu se mai schimbă (copiere în curs)
      let last = -1;
      for (let i = 0; i < 20; i++) { const s = fs.statSync(file).size; if (s === last) break; last = s; await new Promise(r => setTimeout(r, 400)); }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const base = path.basename(name, path.extname(name));
      const res = convertFile(file);
      const errors = res.problems.filter(p => p.level === 'error');
      const report = [`${name} · ${new Date().toISOString()}`, `${res.passports.length} rânduri · ${errors.length} erori`, '',
        ...res.problems.map(p => `rândul ${p.line} · ${p.field}: ${p.message}${p.level === 'warn' ? ' (avertisment)' : ''}`)].join('\n');
      if (errors.length) {
        fs.renameSync(file, path.join(errDir, `${stamp}_${name}`));
        fs.writeFileSync(path.join(errDir, `${stamp}_${base}.raport.txt`), report);
        console.log(c.red('✗ ') + `${name}: ${errors.length} erori → ${path.relative(process.cwd(), errDir)}`);
      } else {
        fs.writeFileSync(path.join(done, `${stamp}_${base}.json`), JSON.stringify(importJson(res.passports), null, 2));
        fs.renameSync(file, path.join(done, `${stamp}_${name}`));
        if (res.problems.length) fs.writeFileSync(path.join(done, `${stamp}_${base}.raport.txt`), report);
        console.log(c.green('✓ ') + `${name}: ${res.passports.length} pașapoarte → ${path.relative(process.cwd(), done)}`);
      }
    } catch (e) { console.log(c.red('✗ ') + `${name}: ${e.message}`); }
    finally { busy.delete(file); }
  };
  console.log(c.bold('Urmăresc ') + path.resolve(dir) + c.dim('  (Ctrl+C pentru oprire)'));
  for (const f of fs.readdirSync(dir)) handle(f);
  fs.watch(dir, (_ev, f) => f && setTimeout(() => handle(f.toString()), 300));
}

async function cmdPush(args) {
  const file = args._[1] || die('Lipsește fișierul: node cli/dpp.mjs push produse.xlsx --api https://dpp.firma.ro --key dpp_live_…');
  if (!fs.existsSync(file)) die(`Nu găsesc ${file}`);
  let passports;
  if (file.toLowerCase().endsWith('.json')) passports = JSON.parse(fs.readFileSync(file, 'utf8')).passports ?? die('JSON fără „passports”');
  else {
    const res = convertFile(file);
    if (printReport(file, res)) die('Corectează erorile înainte de trimitere.', 1);
    passports = importJson(res.passports).passports;
  }
  if (args['dry-run']) { console.log(c.yellow(`--dry-run: s-ar trimite ${passports.length} pașapoarte`)); console.log(JSON.stringify(passports[0] ?? {}, null, 2).slice(0, 1200)); return; }
  const api = String(args.api || process.env.DPP_API || '').replace(/\/+$/, '');
  const key = String(args.key || process.env.DPP_KEY || '');
  if (!api || !key) die('Lipsește --api sau --key (sau variabilele DPP_API / DPP_KEY).');
  let ok = 0;
  for (const p of passports) {
    try {
      const r = await fetch(`${api}/api/v1/passports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'Idempotency-Key': `${p.data?.identificare?.gtin ?? p.name}-${TODAY}` }, body: JSON.stringify(p) });
      if (r.ok) { ok++; console.log(c.green('✓ ') + p.name); }
      else console.log(c.red(`✗ ${p.name}: HTTP ${r.status}`) + c.dim(' ' + (await r.text()).slice(0, 200)));
    } catch (e) {
      die(`Nu pot contacta ${api} (${e.cause?.code ?? e.message}). API-ul REST vine odată cu backend-ul; până atunci folosește convert + Import în platformă.`);
    }
  }
  console.log(`${ok}/${passports.length} trimise`);
}

function help() {
  console.log(`${c.bold('dpp')} — pașapoarte digitale pentru baterii

  template [--all] [--out sablon.xlsx|.csv]       șablon Excel/CSV (obligatorii sau toate câmpurile)
  validate <fisier>                               verifică; cod de ieșire 1 dacă sunt erori
  convert  <fisier> [--out f.json] [--force]      → JSON pentru Import în platformă
  watch    <folder> [--out procesate] [--errors erori]   procesează automat fișierele noi
  push     <fisier> --api URL --key CHEIE [--dry-run]   trimite prin API (backend în lucru)

Coloanele se recunosc după numele câmpului (ex. gtin, battery_mass) sau eticheta în română.`);
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
const commands = { template: cmdTemplate, validate: cmdValidate, convert: cmdConvert, watch: cmdWatch, push: cmdPush };
if (!cmd || cmd === 'help' || args.help) help();
else if (!commands[cmd]) die(`Comandă necunoscută: ${cmd}. Rulează fără argumente pentru ajutor.`);
else Promise.resolve(commands[cmd](args)).catch(e => die(e.message));
