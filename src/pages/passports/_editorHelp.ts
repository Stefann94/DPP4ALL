// Editor helpers: "how to get it" hints for missing fields, and local datasheet extraction (no network).
import { FIELD, applies } from '../../data/catalog';

/** Practical hint: where the data usually comes from. */
export const HOW: Record<string, string> = {
  product_name: 'Denumirea comercială din catalog sau de pe ambalaj.',
  gtin: 'Codul de sub codul de bare. Se obține de la GS1 România (prefix 594).',
  battery_model_identifier: 'Codul de model din fișa tehnică sau de pe eticheta bateriei.',
  manufacturing_place: 'Orașul și țara fabricii care asamblează pachetul.',
  manufacturing_date: 'Luna și anul fabricației lotului (de pe eticheta de producție).',
  battery_mass: 'Masa pachetului complet, din fișa tehnică sau cântărită.',
  manufacturer_name: 'Denumirea legală a firmei care fabrică sau marchează bateria.',
  manufacturer_address: 'Adresa poștală completă a producătorului.',
  manufacturer_country: 'Codul de țară din 2 litere (ex. RO).',
  extinguishing_agent: 'Din fișa cu date de securitate (SDS), secțiunea 5: mijloace de stingere.',
  meaning_of_labels_and_symbols: 'Explică fiecare simbol de pe etichetă (pubelă tăiată, CE, chimie, QR).',
  eu_declaration_of_conformity_url: 'Link la declarația UE de conformitate semnată (PDF).',
  test_reports_url: 'Rapoartele laboratorului (IEC 62619, IEC 62620, UN 38.3). Acces doar pentru autorități.',
  battery_chemistry: 'Chimia celulelor din fișa tehnică a furnizorului (ex. LFP, NMC 811).',
  critical_raw_materials: 'Materiile prime critice din compoziție (litiu, cobalt, grafit, nichel…).',
  cathode_anode_electrolyte_materials: 'Compoziția catodului, anodului și electrolitului de la furnizorul de celule.',
  hazardous_substances: 'Din fișa SDS: substanțele clasificate periculoase (ex. LiPF6).',
  impact_of_substances: 'Pe scurt: ce riscuri au substanțele pentru mediu și sănătate. Din SDS.',
  dismantling_manuals_url: 'Manualul de service / demontare, pentru reciclatori și reparatori.',
  part_numbers_url: 'Lista de piese componente cu coduri (BOM de service).',
  spare_parts_sources_url: 'Pagina sau contactul de unde se comandă piese de schimb.',
  safety_measures_url: 'Instrucțiunile de siguranță pentru manipulare și demontare.',
  renewable_content_share: 'Procentul de materiale din surse regenerabile; de la furnizori.',
  end_user_waste_prevention_url: 'Pagină de ghid pentru utilizator: cum prelungește viața bateriei.',
  end_user_separate_collection_url: 'Pagină despre colectarea separată și punctele de predare.',
  collection_and_second_life_url: 'Pagină despre retur, reutilizare și reciclare (schema EPR).',
  waste_battery_safety_instructions: 'Ce face utilizatorul cu bateria uzată: izolare borne, transport, predare.',
  rated_capacity: 'Capacitatea nominală din fișa tehnică (Ah).',
  minimum_voltage: 'Tensiunea de descărcare completă (cut-off) din fișa tehnică.',
  maximum_voltage: 'Tensiunea de încărcare completă din fișa tehnică.',
  nominal_voltage: 'Tensiunea nominală din fișa tehnică.',
  original_power_capability: 'Puterea pe care o poate livra bateria nouă (W), din teste.',
  maximum_permitted_battery_power: 'Puterea maximă permisă de BMS (W).',
  initial_round_trip_energy_efficiency: 'Eficiența încărcare-descărcare la început de viață, din test.',
  round_trip_energy_efficiency_at_50_of_cycle_life: 'Eficiența măsurată sau estimată la jumătatea duratei de viață.',
  initial_internal_resistance_pack: 'Rezistența internă a pachetului la început de viață (mΩ).',
  initial_internal_resistance_of_battery_cell: 'Rezistența internă a celulei (mΩ), din fișa celulei.',
  expected_lifetime_number_of_charge_discharge_cycles: 'Numărul de cicluri până la 80% din capacitate, din testul de anduranță.',
  cycle_life_reference_test: 'Standardul și condițiile testului (ex. IEC 62620, 25 °C, 0,5C, 90% DoD).',
  c_rate_of_relevant_cycle_life_test: 'Curentul testului raportat la capacitate (ex. 0,5).',
  capacity_threshold_for_exhaustion: 'Pragul de capacitate sub care bateria e considerată epuizată (EV).',
  temperature_range_idle_state_lower_boundary: 'Temperatura minimă de stocare din fișa tehnică.',
  temperature_range_idle_state_upper_boundary: 'Temperatura maximă de stocare din fișa tehnică.',
  temperature_range_idle_state_reference_test: 'Standardul testului de stocare.',
  capacity_fade: 'Pierderea de capacitate estimată la sfârșitul garanției (%).',
  power_fade: 'Pierderea de putere estimată (%).',
  internal_resistance_increase: 'Creșterea estimată a rezistenței interne (%).',
  expected_lifetime_in_calendar_years: 'Durata de viață estimată în ani.',
};
export const howFor = (name: string) => HOW[name] ?? 'Din documentația tehnică a produsului sau de la furnizor.';

export interface Proposal { section: string; field: string; value: unknown; evidence: string; unitField?: string; unitValue?: string }

const n = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
const line = (text: string, idx: number) => text.slice(Math.max(0, text.lastIndexOf('\n', idx) + 1), (text.indexOf('\n', idx) + 1 || text.length + 1) - 1).trim().slice(0, 120);

/** Heuristic extraction from datasheet text. Only fields that apply to the category are returned. */
export function extractFromDatasheet(text: string, category: string | null): Proposal[] {
  const t = text.replace(/\r/g, '');
  const out: Proposal[] = [];
  const add = (field: string, value: unknown, at: number, extra: Partial<Proposal> = {}) => {
    const f = FIELD[field];
    if (!f || !applies(f, category) || out.some(p => p.field === field)) return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    out.push({ section: f.section, field, value, evidence: line(t, at), ...extra });
  };
  const find = (re: RegExp) => { const m = re.exec(t); return m ? { m, at: m.index } : null; };
  const NUM = '(\\d[\\d\\s]*(?:[.,]\\d+)?)';

  let r = find(new RegExp(`(?:nominal|rated|typical|capacitate nominal[aă]|capacity)[^\\n]{0,40}?${NUM}\\s*(mAh|Ah)\\b`, 'i')) ?? find(new RegExp(`${NUM}\\s*(Ah|mAh)\\b`, 'i'));
  if (r) add('rated_capacity', n(r.m[1]!), r.at, { unitField: 'rated_capacity_unit', unitValue: r.m[2]!.toLowerCase() === 'mah' ? 'mAh' : 'Ah' });
  r = find(new RegExp(`(?:nominal|rated)\\s*voltage[^\\n]{0,30}?${NUM}\\s*V\\b`, 'i')) ?? find(new RegExp(`tensiune\\s*nominal[aă][^\\n]{0,30}?${NUM}\\s*V\\b`, 'i'));
  if (r) add('nominal_voltage', n(r.m[1]!), r.at);
  r = find(new RegExp(`(?:discharge\\s*cut-?off|cut-?off|end[- ]of[- ]discharge|min(?:imum)?\\s*voltage|tensiune\\s*minim[aă])[^\\n]{0,30}?${NUM}\\s*V\\b`, 'i'));
  if (r) add('minimum_voltage', n(r.m[1]!), r.at);
  r = find(new RegExp(`(?:charge\\s*(?:cut-?off\\s*)?voltage|max(?:imum)?\\s*(?:charge\\s*)?voltage|tensiune\\s*maxim[aă])[^\\n]{0,30}?${NUM}\\s*V\\b`, 'i'));
  if (r) add('maximum_voltage', n(r.m[1]!), r.at);

  const chem: [RegExp, string, string][] = [
    [/LiFePO4|\bLFP\b/i, 'Litiu-ion LFP (LiFePO4)', 'lithiumIonLFP'], [/\bNMC\b|\bNCM\b/i, 'Litiu-ion NMC', 'lithiumIonNMC'], [/\bNCA\b/i, 'Litiu-ion NCA', 'lithiumIonNCA'],
    [/\bLMO\b|LiMn2O4/i, 'Litiu-ion LMO', 'lithiumIonLMO'], [/\bLCO\b|LiCoO2/i, 'Litiu-ion LCO', 'lithiumIonLCO'], [/sodium[- ]ion|Na-ion|sodiu/i, 'Sodiu-ion', 'sodiumIon'],
    [/lead[- ]acid|plumb[- ]acid|\bAGM\b/i, 'Plumb-acid', 'leadAcid'], [/Ni-?MH/i, 'Nichel-metal hidrură (NiMH)', 'nickelMetalHydride'], [/\bLTO\b|titanate/i, 'Litiu-titanat (LTO)', ''],
  ];
  for (const [re, label, code] of chem) {
    const m = re.exec(t); if (!m) continue;
    add('battery_chemistry', label, m.index);
    if (code) add('battery_chemistry_codes', [code], m.index);
    break;
  }
  r = find(new RegExp(`(?:weight|mass|greutate|mas[aă])[^\\n]{0,30}?${NUM}\\s*(kg|g)\\b`, 'i'));
  if (r) add('battery_mass', n(r.m[1]!), r.at, { unitField: 'battery_mass_unit', unitValue: r.m[2]!.toLowerCase() });
  r = find(new RegExp(`${NUM}\\s*(?:cycles|cicluri)`, 'i')) ?? find(new RegExp(`(?:cycle\\s*life|durat[aă]\\s*de\\s*via[tț][aă])[^\\n]{0,30}?${NUM}`, 'i'));
  if (r) {
    add('expected_lifetime_number_of_charge_discharge_cycles', Math.round(n(r.m[1]!)), r.at);
    const ctx = line(t, r.at);
    const dod = /(\d{2,3})\s*%\s*DoD/i.exec(ctx);
    const temp = /(\d{2})\s*°\s*C/.exec(ctx);
    const crate = /(\d+(?:[.,]\d+)?)\s*C\b(?!\w)/.exec(ctx.replace(/°\s*C/g, ''));
    add('cycle_life_reference_test', [/IEC\s*\d{5}/i.exec(t)?.[0], temp && `${temp[1]} °C`, crate && `${crate[1]}C`, dod && `${dod[1]}% DoD`].filter(Boolean).join(', ') || ctx, r.at);
    if (crate) add('c_rate_of_relevant_cycle_life_test', n(crate[1]!), r.at);
  }
  r = find(/(?:storage|stocare|depozitare)[^\n]{0,40}?(-?\d{1,2})\s*°?\s*C?\s*(?:~|to|–|—|-|până\s*la|\.\.)\s*\+?(-?\d{1,3})\s*°\s*C/i);
  if (r) { add('temperature_range_idle_state_lower_boundary', n(r.m[1]!), r.at); add('temperature_range_idle_state_upper_boundary', n(r.m[2]!), r.at); }
  r = find(/(?:operating|discharge|func[tț]ionare|operare)[^\n]{0,40}?(-?\d{1,2})\s*°?\s*C?\s*(?:~|to|–|—|-|până\s*la|\.\.)\s*\+?(-?\d{1,3})\s*°\s*C/i);
  if (r) { add('voltage_temperature_lower', n(r.m[1]!), r.at); add('voltage_temperature_upper', n(r.m[2]!), r.at); }
  r = find(new RegExp(`(?:internal\\s*resistance|impedance|AC\\s*IR|rezisten[tț][aă]\\s*intern[aă])[^\\n]{0,40}?${NUM}\\s*(mΩ|mOhm|m\\s*ohm|Ω|ohm)`, 'i'));
  if (r) {
    const isCell = /cell|celul/i.test(line(t, r.at));
    const unit = /^m/i.test(r.m[2]!) ? 'mOhm' : 'Ohm';
    if (isCell) add('initial_internal_resistance_of_battery_cell', n(r.m[1]!), r.at, { unitField: 'initial_internal_resistance_cell_unit', unitValue: unit });
    else add('initial_internal_resistance_pack', n(r.m[1]!), r.at, { unitField: 'initial_internal_resistance_pack_unit', unitValue: unit });
  }
  r = find(new RegExp(`(?:max(?:imum)?\\s*(?:continuous\\s*)?(?:discharge\\s*|output\\s*)?power|putere\\s*maxim[aă])[^\\n]{0,30}?${NUM}\\s*(kW|W)\\b`, 'i'));
  if (r) { const w = n(r.m[1]!) * (r.m[2]!.toLowerCase() === 'kw' ? 1000 : 1); add('maximum_permitted_battery_power', w, r.at); add('original_power_capability', w, r.at); }
  else {
    r = find(new RegExp(`(?:max(?:imum)?\\s*(?:continuous\\s*)?discharge\\s*current|curent\\s*maxim)[^\\n]{0,30}?${NUM}\\s*A\\b`, 'i'));
    const vn = out.find(p => p.field === 'nominal_voltage')?.value as number | undefined;
    if (r && vn) add('maximum_permitted_battery_power', Math.round(n(r.m[1]!) * vn), r.at);
  }
  r = find(new RegExp(`(?:round[- ]trip|energy\\s*efficiency|eficien[tț][aă])[^\\n]{0,30}?${NUM}\\s*%`, 'i'));
  if (r) add('initial_round_trip_energy_efficiency', n(r.m[1]!), r.at);
  r = find(new RegExp(`(?:self[- ]discharge|autodesc[aă]rcare)[^\\n]{0,30}?${NUM}\\s*%\\s*(?:/|per|pe)\\s*(month|lun[aă]|year|an)`, 'i'));
  if (r) add(/^(month|lun)/i.test(r.m[2]!) ? 'initial_self_discharge_rate' : 'initial_self_discharge_rate_per_year', n(r.m[1]!), r.at);
  r = find(/(?:warranty|garan[tț]ie)[^\n]{0,30}?(\d{1,3})\s*(years?|yrs|ani|months?|luni)/i);
  if (r) add('warranty_period_of_the_battery', n(r.m[1]!), r.at, { unitField: 'warranty_period_unit', unitValue: /^(month|lun)/i.test(r.m[2]!) ? 'months' : 'years' });
  r = find(/(?:manufacturer|producător|produc[aă]tor|made\s*by)\s*[:\-]\s*([^\n]{3,60})/i);
  if (r) add('manufacturer_name', r.m[1]!.trim(), r.at);
  r = find(/(?:model|part\s*number|type)\s*[:\-]\s*([A-Z0-9][A-Z0-9\-_.\/]{2,30})/i);
  if (r) add('battery_model_identifier', r.m[1]!.trim(), r.at);
  r = find(/IEC\s*62619|UN\s*38\.3|IEC\s*62620/i);
  return out;
}

/** Best-effort text from a PDF (uncompressed + Flate streams) using the browser's DecompressionStream. */
export async function pdfText(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const latin = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!); return s; };
  const raw = latin(bytes);
  const chunks: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    const data = bytes.slice(start, end);
    try {
      const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
      chunks.push(latin(new Uint8Array(await new Response(ds).arrayBuffer())));
    } catch { chunks.push(latin(data)); }
    re.lastIndex = end;
  }
  const text: string[] = [];
  for (const c of chunks) {
    for (const block of c.split(/\bET\b/)) {
      const parts: string[] = [];
      const tj = /\((?:\\.|[^\\)])*\)|\[(?:[^\]]*)\]\s*TJ/g;
      let x: RegExpExecArray | null;
      while ((x = tj.exec(block))) {
        const s = x[0].startsWith('[') ? [...x[0].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map(y => y[1]).join('') : x[0].slice(1, -1);
        parts.push(s.replace(/\\([()\\])/g, '$1').replace(/\\n/g, ' '));
      }
      if (parts.length) text.push(parts.join(''));
    }
  }
  return text.join('\n').replace(/[^\x20-\x7E\n -ɏ°Ω]/g, ' ').replace(/[ \t]+/g, ' ');
}
