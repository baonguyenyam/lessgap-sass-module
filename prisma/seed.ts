import { config } from "dotenv"

// Same loading order as prisma.config.ts: .env.local first, .env after it,
// variables already set in the shell win. Needed when run via `npm run db:seed`,
// which does not go through the Prisma CLI.
config({ path: [".env.local", ".env"], quiet: true })

type BillingInterval = "MONTH" | "YEAR" | "ONE_TIME"

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE plans — these exist so the Stripe checkout flow works out of the box.
// Replace name/description/features/price
// with YOUR product's plans, and set real Stripe price IDs via the env vars below
// (or hard-code your own). The six plans demonstrate every billing pattern the
// kit supports: monthly, yearly, one-time (lifetime) and metered (usage-based,
// seeded inactive: remove `active: false` to enable it).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `.env.example` ships every unused variable as VAR="", so an empty string has
 * to mean "not configured" here too. With `??` it reached the database, and six
 * plans sharing one empty price ID break the unique index on the second upsert:
 * the seed failed for anyone who copied the example file, which is what the
 * guide tells you to do.
 */
const priceId = (value: string | undefined, placeholder: string) => value?.trim() || placeholder

const examplePlans: {
  slug: string
  name: string
  description: string
  price: number
  interval: BillingInterval
  stripePriceId: string
  features: string[]
  meterEventName?: string
  trialDays?: number
  isActive?: boolean
}[] = [
  {
    slug: "starter-monthly",
    name: "Starter",
    description: "Example entry plan: replace with your own",
    price: 900,
    interval: "MONTH",
    stripePriceId: priceId(process.env.STRIPE_STARTER_PRICE_ID, "price_starter_placeholder"),
    features: ["Up to 3 projects", "Basic analytics", "Community support"],
  },
  {
    slug: "starter-yearly",
    name: "Starter Yearly",
    description: "Example annual plan: save 2 months",
    price: 9000,
    interval: "YEAR",
    stripePriceId: priceId(process.env.STRIPE_STARTER_YEARLY_PRICE_ID, "price_starter_yearly_placeholder"),
    features: ["Up to 3 projects", "Basic analytics", "2 months free"],
  },
  {
    slug: "pro-monthly",
    name: "Pro",
    description: "Example paid plan: replace with your own",
    price: 1900,
    interval: "MONTH",
    stripePriceId: priceId(process.env.STRIPE_PRO_PRICE_ID, "price_pro_placeholder"),
    // A free trial, to show the pattern: offered once per customer at checkout.
    // Remove the line and the plan has none.
    trialDays: 14,
    features: ["Everything in Starter", "Unlimited projects", "Advanced analytics", "Priority support"],
  },
  {
    slug: "pro-yearly",
    name: "Pro Yearly",
    description: "Example annual plan: save 2 months",
    price: 19000,
    interval: "YEAR",
    stripePriceId: priceId(process.env.STRIPE_PRO_YEARLY_PRICE_ID, "price_pro_yearly_placeholder"),
    features: ["Everything in Pro", "2 months free", "Priority support"],
  },
  {
    slug: "lifetime",
    name: "Lifetime",
    description: "Example one-time purchase: pay once, keep it forever",
    price: 29900,
    interval: "ONE_TIME",
    stripePriceId: priceId(process.env.STRIPE_LIFETIME_PRICE_ID, "price_lifetime_placeholder"),
    features: ["Everything in Pro", "All future updates", "No recurring billing"],
  },
  {
    // Usage-based example, seeded INACTIVE so it never shows up in the UI until
    // you have created a Billing Meter + metered price in Stripe.
    slug: "metered-example",
    name: "Pay as you go",
    description: "Example usage-based plan billed per API request",
    price: 0,
    interval: "MONTH",
    stripePriceId: priceId(process.env.STRIPE_METERED_PRICE_ID, "price_metered_placeholder"),
    features: ["Billed per API request", "No monthly minimum"],
    meterEventName: "api_request",
    isActive: false,
  },
]

async function main() {
  // Imported after dotenv has run: src/lib/db8.ts reads DATABASE_URL while
  // its module initializes.
  const { db8, uniqueIndexKey } = await import("@/lib/db8")
  const { grantRootFromConfig } = await import("@/lib/root-accounts")
  try {
    for (const plan of examplePlans) {
      const { slug, ...data } = plan
      await db8.orm.public.Plan.upsert({
        conflictOn: uniqueIndexKey({ slug }),
        // keep the Stripe price ID (and copy tweaks) in sync with env on re-seed
        update: {
          stripePriceId: data.stripePriceId,
          description: data.description,
          meterEventName: data.meterEventName ?? null,
          trialDays: data.trialDays ?? null,
        },
        create: { slug, ...data },
      })
    }

    // The module availability switch (task 2.10): `module.<key>` is the
    // platform-side gate; the tenant still enables it under Settings → Modules.
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.newsletter" },
      create: { key: "module.newsletter", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.catalog" },
      create: { key: "module.catalog", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.team" },
      create: { key: "module.team", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.booking" },
      create: { key: "module.booking", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.customers" },
      create: { key: "module.customers", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.notifications" },
      create: { key: "module.notifications", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.reservations" },
      create: { key: "module.reservations", value: true, updatedById: "seed" },
      update: {},
    })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.payments" },
      create: { key: "module.payments", value: true, updatedById: "seed" },
      update: {},
    })
    console.log(`Seed complete: ${examplePlans.length} example plans upserted`)
    const roots = await grantRootFromConfig()
    if (roots > 0) console.log(`ROOT granted to ${roots} account(s) from ROOT_EMAILS`)
  } finally {
    await db8.close()
  }
}

main().catch((error) => {
  console.error(error)
  // Without this the process exits 0, and Prisma signs off with "The seed
  // command has been executed" after a seed that did nothing.
  process.exitCode = 1
})
