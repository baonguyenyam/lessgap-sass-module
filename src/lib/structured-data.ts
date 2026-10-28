/**
 * LocalBusiness JSON-LD (spec/03): built from the same `SiteSettings.profile`
 * the page renders — two copies of the same fact drift, so both come from
 * one value. A field the tenant never filled is omitted, not `undefined`.
 */
export type LocalBusinessInput = {
  name: string
  tagline?: string
  phone?: string
  email?: string
  address?: string
  origin: string
  logo?: string
}

export function localBusinessJsonLd(biz: LocalBusinessInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: biz.name,
    url: biz.origin,
  }
  if (biz.tagline) out.description = biz.tagline
  if (biz.phone) out.telephone = biz.phone
  if (biz.email) out.email = biz.email
  if (biz.address) out.address = biz.address
  if (biz.logo) out.image = biz.logo
  return out
}
