import { config } from "dotenv"

config({ path: [".env.local", ".env"], quiet: true })

// ─────────────────────────────────────────────────────────────────────────────
// DEMO seed — fills an ISOLATED demo database with believable fake data so a
// public demo deployment (DEMO_MODE="true") has something to show: users for
// the admin panel, subscriptions for the MRR metrics, projects for the CRUD,
// and a lifetime purchase so the one-time billing state is visible too.
//
// The dataset and the writing logic live in src/lib/demo-seed.ts, shared with
// the scheduled reset at /api/cron/reset-demo so the two cannot drift.
//
// ⚠️ Running it WIPES all users/subscriptions/projects and recreates them —
// that's the point: re-run it to reset the demo. Never point it at a database
// with real users.
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Imported after dotenv has run: src/lib/db8.ts reads DATABASE_URL while
  // its module initializes.
  const { db8 } = await import("@/lib/db8")
  const { seedDemoData } = await import("@/lib/demo-seed")
  const { grantRootFromConfig } = await import("@/lib/root-accounts")
  try {
    const { users, subscriptions, purchases } = await seedDemoData()
    console.log(`Demo seed complete: ${users} users, ${subscriptions} subscriptions, ${purchases} purchases`)
    const roots = await grantRootFromConfig()
    if (roots > 0) console.log(`ROOT granted to ${roots} account(s) from ROOT_EMAILS`)
  } finally {
    await db8.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
