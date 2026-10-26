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
  const { prisma } = await import("../src/lib/prisma")
  const { seedDemoData } = await import("../src/lib/demo-seed")
  try {
    const { users, subscriptions, purchases, projects } = await seedDemoData(prisma)
    console.log(
      `Demo seed complete: ${users} users, ${subscriptions} subscriptions, ${purchases} purchases, ${projects} projects`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
