import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { slugify } from "@/lib/slugify"

const BATCH = 500

/**
 * One tenant per existing user (phase 1, decision 1-A, task 1.12): every User
 * with no Member row gets a Tenant named after them — the same name and slug
 * shape `ensureTenant` produces on a first visit — and an owner membership.
 * `stripeCustomerId` carries onto the tenant so the phase-2 schema change can
 * point `Subscription`/`Purchase` rows at it.
 *
 * Idempotent (M4): a user who already has a member row is skipped, so running
 * the script twice — or again after a crash — only creates what is missing.
 * The CLI wrapper is `scripts/backfills/20261028-platform-tenant-per-user.ts`.
 */
export async function runTenantPerUserBackfill({
  apply = false,
  log = console.log,
}: {
  apply?: boolean
  log?: (message: string) => void
} = {}): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0
  let offset = 0

  for (;;) {
    const users = await db8.orm.public.User.select("id", "name", "email", "stripeCustomerId")
      .orderBy((u) => u.id.asc())
      .offset(offset)
      .limit(BATCH)
      .all()
    if (users.length === 0) break
    offset += users.length

    const members = await db8.orm.public.Member.select("userId")
      .where((m) => m.userId.in(users.map((u) => u.id)))
      .all()
    const hasTenant = new Set(members.map((m) => m.userId))

    for (const user of users) {
      if (hasTenant.has(user.id)) {
        skipped++
        continue
      }
      const displayName = user.name || user.email || "workspace"
      if (!apply) {
        log(`dry-run: would create tenant "${displayName}" for ${user.email}`)
        created++
        continue
      }

      const base = slugify(displayName.includes("@") ? displayName.split("@")[0] : displayName)
      let slug = base
      for (let i = 2; await db8.orm.public.Tenant.where({ slug }).first(); i++) slug = `${base}-${i}`

      // `userId` without a session is the plugin's system action: it creates
      // the tenant and the owner membership in one write, like createTenantFor.
      const tenant = await auth.api.createOrganization({
        body: { name: displayName, slug, userId: user.id },
      })
      await db8.orm.public.Tenant.where({ id: tenant.id }).update({
        status: "ACTIVE",
        ...(user.stripeCustomerId ? { stripeCustomerId: user.stripeCustomerId } : {}),
      })
      log(`created tenant ${slug} for ${user.email}`)
      created++
    }
    log(`batch done: ${created} created, ${skipped} skipped so far`)
  }

  return { created, skipped }
}
