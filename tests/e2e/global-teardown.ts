import { config } from "dotenv"

// Playwright does not read .env files the way Next does, so without this the
// connection string is missing here even though the app under test has it.
config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Removes the accounts the suite created.
 *
 * Signing up is the flow under test, so every run leaves real rows behind.
 * Without this the development database fills with e2e-* users, the admin
 * panel becomes unreadable, and the demo metrics stop meaning anything.
 *
 * Matches on the e2e- prefix only, so it can never touch a real account.
 */
export default async function globalTeardown() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // Loudly: a silent return here leaves the database filling up run after
    // run, and nobody notices until the admin panel is unusable.
    console.warn("\n  teardown skipped: DATABASE_URL is not set, test accounts were left behind")
    return
  }

  const { db8 } = await import("@/lib/db8")
  try {
    // Their tenants first: a tenant outlives its members' accounts, and each
    // e2e signup gets one named after the address (task 1.7).
    await db8.orm.public.Tenant.where((t) => t.slug.like("e2e-%")).deleteAndCount()
    const count = await db8.orm.public.User.where((u) => u.email.like("e2e-%")).deleteAndCount()
    if (count > 0) console.log(`\n  cleaned up ${count} test account(s)`)
  } finally {
    await db8.close()
  }
}
