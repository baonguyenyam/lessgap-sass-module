import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { connection } from "next/server"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import type { FormDefinition } from "@/lib/quotes/form"
import { QuoteRequestForm } from "@/components/quotes/request-form"

/** The site quote request (task 6.6): the tenant's schema-driven form —
 * the tenant owns the definition; we render its fields. */
export default async function QuotePage() {
  await connection()
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()
  const c = systemContext(resolved.tenantId, "customer")
  await requireModule(c, "quotes")
  const t = await getTranslations("site.quote")
  const row = await db8.orm.public.TenantSetting.where({ tenantId: resolved.tenantId, key: "quotes.form" }).first()
  const form = Array.isArray(row?.value) ? (row.value as FormDefinition) : []
  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <QuoteRequestForm form={form} />
    </div>
  )
}
