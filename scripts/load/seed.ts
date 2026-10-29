#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON
/** Load-test fixture (task 8.6, spec/16 scale targets): N tenants, each
 * with a published site, resolvable as <slug>.<sites domain>. Run against
 * a staging database — the seed writes real rows. */
import "dotenv/config"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"

const N = Number(process.env.LOAD_TENANTS ?? "50")

async function main() {
  for (let i = 0; i < N; i++) {
    const slug = `load-${i.toString(36).padStart(4, "0")}`
    const existing = await db8.orm.public.Tenant.where({ slug }).first()
    if (existing) continue
    const tenant = await db8.orm.public.Tenant.create({
      name: `Load ${i}`,
      slug,
      status: "ACTIVE",
    })
    await db8.orm.public.Site.create({
      tenantId: tenant.id,
      themeKey: "classic",
      status: "PUBLISHED",
      publishedAt: nowTs(),
    })
    await db8.orm.public.SiteSettings.create({
      tenantId: tenant.id,
      profile: { name: `Load ${i}`, tagline: "load fixture" },
    })
  }
  console.log(`seeded ${N} load tenants`)
  await db8.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
