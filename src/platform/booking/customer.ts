import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"

/** The customer upsert (task 5.4, spec/07): a booker deduplicates by email
 * first, then phone, within the tenant. Consent stamps are set once, at
 * first consent, and never overwritten silently. */
export async function upsertCustomer(
  tenantId: string,
  input: {
    name: string
    email?: string
    phone?: string
    language?: string
    marketingConsent?: boolean
    smsConsent?: boolean
    source?: string
  }
) {
  const existing = input.email
    ? await db8.orm.public.Customer.where({ tenantId, email: input.email }).first()
    : input.phone
      ? await db8.orm.public.Customer.where({ tenantId, phone: input.phone }).first()
      : null
  const consent = {
    ...(input.marketingConsent && !existing?.marketingConsentAt
      ? { marketingConsentAt: nowTs(), marketingConsentSource: input.source ?? "site" }
      : {}),
    ...(input.smsConsent && !existing?.smsConsentAt
      ? { smsConsentAt: nowTs(), smsConsentSource: input.source ?? "site" }
      : {}),
  }
  if (existing) {
    await db8.orm.public.Customer.where({ id: existing.id }).update({
      name: input.name,
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...consent,
    })
    return existing.id
  }
  const row = await db8.orm.public.Customer.create({
    tenantId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    language: input.language ?? "en",
    ...consent,
  })
  return row.id
}
