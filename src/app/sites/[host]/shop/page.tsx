import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { connection } from "next/server"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { systemContext } from "@/platform/tenancy/context"
import { requireModuleRoute } from "@/platform/modules/runtime"
import { canCharge } from "@/platform/payments/connect"
import { ShopClient } from "@/components/shop/shop-client"

/** The site shop (task 6.4): products with their variants — buy only when
 * the tenant's connected account can charge (spec/05, hidden not broken). */
export default async function ShopPage() {
  await connection()
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()
  const c = systemContext(resolved.tenantId, "customer")
  await requireModuleRoute(c, "shop")
  const t = await getTranslations("site.shop")
  const tenant = await db8.orm.public.Tenant.where({ id: resolved.tenantId }).first()
  const products = await db8.orm.public.Product.where({ tenantId: resolved.tenantId, isActive: true })
    .include("variants")
    .all()
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ShopClient
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          variants: p.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents })),
        }))}
        canCharge={canCharge(tenant ?? {})}
      />
    </div>
  )
}
