// Passport → JSON based on EN 18223 (DPP data exchange), flat camelCase like the published examples.
// Access tier filtering is applied here so the same builder serves public, legitimate-interest and authority views.
import { FIELD, TIER_RANK, applies } from '../data/catalog';
import { digitalLink } from './gs1';
import type { AccessTier, DocumentFile, OrgSettings, Passport, Unit } from '../types';

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export function toEN18223(p: Passport, org: OrgSettings, opts: { unit?: Unit; tier?: AccessTier; documents?: DocumentFile[] } = {}) {
  const tier = opts.tier ?? 'public';
  const allowed = (t: AccessTier) => TIER_RANK[t] <= TIER_RANK[tier];
  const productUrl = digitalLink(org.resolver, p.gtin, { serial: opts.unit?.serial });
  const out: Record<string, unknown> = {
    digitalProductPassportId: `${org.resolver.replace(/\/+$/, '')}/p/${p.id}`,
    uniqueProductIdentifier: productUrl ?? `${org.resolver.replace(/\/+$/, '')}/p/${p.id}`,
    granularity: opts.unit ? 'item' : 'model',
    dppSchemaVersion: 'EN18223:v1.0',
    dppStatus: p.status === 'published' ? 'active' : 'inactive',
    lastUpdated: p.updatedAt,
    ...(org.gln ? { economicOperatorId: `urn:gln:${org.gln}` } : {}),
    economicOperatorName: org.name,
    dppServiceProvider: { name: 'Platforma DPP Baterii', url: org.resolver },
  };
  for (const [section, values] of Object.entries(p.data ?? {})) {
    for (const [k, v] of Object.entries(values ?? {})) {
      const f = FIELD[k];
      if (!f || f.section !== section || !applies(f, p.category)) continue;
      if (!allowed(f.access_tier)) continue;
      if (tier === 'public' && f.withheld_from_public) continue;
      out[camel(k)] = v;
      if (f.type === 'number' && f.unit && !f.unit_field) out[camel(k) + 'Unit'] = f.unit;
    }
  }
  if (opts.unit) {
    const u = opts.unit;
    out.serialNumber = u.serial;
    if (u.batch) out.batchNumber = u.batch;
    if (u.manufacturingDate) out.manufacturingDate = u.manufacturingDate;
    out.batteryStatus = u.status;
    for (const [k, v] of Object.entries(u.values ?? {})) {
      const f = FIELD[k];
      if (!f || k === 'status' || !allowed(f.access_tier)) continue;
      out[camel(k)] = v;
    }
  }
  if (opts.documents) {
    out.documents = opts.documents.filter(d => d.passportIds.includes(p.id) && allowed(d.accessTier))
      .map(d => ({ resourceTitle: d.name, contentType: d.mime, documentType: d.type, accessTier: d.accessTier }));
  }
  return out;
}
