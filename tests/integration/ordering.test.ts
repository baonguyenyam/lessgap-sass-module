import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers({ host: "site.test" }) }
})
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})
vi.mock("@/platform/payments/connect", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/payments/connect")>()
  return { ...mod, createCheckout: vi.fn(async () => ({ paymentId: "p1", checkoutUrl: "https://pay.test/x" })) }
})
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})

const { placeOrder, setOrderStatus } = await import("@/app/actions/ordering")
const { resolveHost } = await import("@/platform/tenancy/host")
const { requireTenantContext } = await import("@/platform/tenancy/require-member")

// Wednesday 11:00–12:00, two 30-minute slots — next Wednesday from now.
function nextWednesdaySlot(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + ((3 - d.getUTCDay() + 7) % 7 || 7))
  d.setUTCHours(11, 0, 0, 0)
  return d.toISOString()
}
const SLOT = nextWednesdaySlot()

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `ord-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "O",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "Diner", slug: `diner-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({
    status: "ACTIVE",
    chargesEnabled: true,
    stripeAccountId: `acct_${tenant.id.slice(-8)}`,
  })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "ordering", enabled: true })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "shop", enabled: true })
  for (const key of ["module.ordering", "module.shop"]) {
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key },
      create: { key, value: true, updatedById: "test" },
      update: {},
    })
  }
  await db8.orm.public.ReservationRule.create({
    tenantId: tenant.id,
    weekday: 3,
    startMinute: 660,
    endMinute: 720,
    slotMinutes: 30,
  })
  await db8.orm.public.TenantSetting.create({ tenantId: tenant.id, key: "ordering.kitchen_capacity", value: 2 })
  const product = await db8.orm.public.Product.create({ tenantId: tenant.id, name: "Pho", type: "menu_item" })
  const variant = await db8.orm.public.ProductVariant.create({
    tenantId: tenant.id,
    productId: product.id,
    name: "Regular",
    priceCents: 1200,
  })
  const group = await db8.orm.public.ProductModifierGroup.create({
    tenantId: tenant.id,
    productId: product.id,
    name: "Extras",
  })
  const mod = await db8.orm.public.ProductModifier.create({
    tenantId: tenant.id,
    groupId: group.id,
    name: "Beef",
    priceCents: 300,
  })
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: tenant.slug })
  return { tenant, variant, mod }
}

describe("ordering (6.5)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("an order totals variant + modifiers, in the free pickup slot", async () => {
    const { tenant, variant, mod } = await provision()
    const res = await placeOrder({
      lines: [{ variantId: variant.id, quantity: 2, modifierIds: [mod.id] }],
      pickupSlot: SLOT,
      name: "Bia",
    })
    expect(res.error).toBeUndefined()
    expect(res.checkoutUrl).toBe("https://pay.test/x")
    const order = await db8.orm.public.Order.where({ tenantId: tenant.id }).first()
    expect(order).not.toBeNull()
    // (1200 + 300) × 2 = 3000
    expect(order!.totalCents).toBe(3000)
    expect(order!.pickupSlot).toBe(SLOT)
    expect(order!.fulfilment).toBe("pickup")
    const lines = await db8.orm.public.OrderLine.where({ tenantId: tenant.id, orderId: order!.id }).all()
    expect(lines[0]!.modifiers).toEqual([{ name: "Beef", priceCents: 300 }])
  })

  it("a slot at capacity conflicts", async () => {
    const { tenant, variant } = await provision()
    // capacity is 2 — fill the slot.
    for (const name of ["one", "two"]) {
      await db8.orm.public.Order.create({
        tenantId: tenant.id,
        customerName: name,
        totalCents: 100,
        fulfilment: "pickup",
        pickupSlot: SLOT,
        status: "paid",
      })
    }
    const res = await placeOrder({ lines: [{ variantId: variant.id, quantity: 1 }], pickupSlot: SLOT, name: "three" })
    expect(res.error).toBe("conflict")
  })

  it("the board walks received → preparing → ready → done", async () => {
    const { tenant } = await provision()
    const order = await db8.orm.public.Order.create({
      tenantId: tenant.id,
      customerName: "Ana",
      totalCents: 100,
      fulfilment: "pickup",
      status: "received",
    })
    vi.mocked(requireTenantContext).mockResolvedValue({
      tenantId: tenant.id,
      user: { id: "u1" },
      member: { role: "owner" },
    } as Awaited<ReturnType<typeof requireTenantContext>>)
    for (const to of ["preparing", "ready", "done"]) {
      const res = await setOrderStatus({ orderId: order.id, toStatus: to })
      expect(res.error).toBeUndefined()
    }
    const row = await db8.orm.public.Order.where({ id: order.id }).first()
    expect(row!.status).toBe("done")
    // skipping a step is rejected
    expect((await setOrderStatus({ orderId: order.id, toStatus: "preparing" })).error).toBe("invalid_input")
  })
})
