import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return {
    ...mod,
    headers: async () => new Headers({ host: "site.test" }),
    cookies: async () => ({
      get: (k: string) => (sharedJar.has(k) ? { value: sharedJar.get(k) } : undefined),
      set: (k: string, v: string) => void sharedJar.set(k, v),
    }),
  }
})
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})
vi.mock("@/platform/payments/connect", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/payments/connect")>()
  return { ...mod, createCheckout: vi.fn(async () => ({ paymentId: "p1", checkoutUrl: "https://pay.test/x" })) }
})

// One jar for every cookies() call — addToCart and checkoutCart share it.
const sharedJar = new Map<string, string>()

const { checkoutCart, addToCart } = await import("@/app/actions/shop")
const { resolveHost } = await import("@/platform/tenancy/host")
const { createCheckout } = await import("@/platform/payments/connect")

async function provision(chargesEnabled = true) {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `shop-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "S",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "ShopCo", slug: `shop-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({
    status: "ACTIVE",
    chargesEnabled,
    stripeAccountId: `acct_${tenant.id.slice(-8)}`,
  })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "shop", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.shop" },
    create: { key: "module.shop", value: true, updatedById: "test" },
    update: {},
  })
  const product = await db8.orm.public.Product.create({ tenantId: tenant.id, name: "Card", type: "physical" })
  const variant = await db8.orm.public.ProductVariant.create({
    tenantId: tenant.id,
    productId: product.id,
    name: "Std",
    priceCents: 500,
  })
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: tenant.slug })
  return { tenant, product, variant }
}

describe("shop (6.4)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("checkout writes Order + OrderLine and asks payments for the session", async () => {
    const { tenant, variant } = await provision()
    await addToCart({ variantId: variant.id })
    await addToCart({ variantId: variant.id })
    const res = await checkoutCart({ name: "Ana", email: "a@x.test" })
    expect(res.error).toBeUndefined()
    expect(res.checkoutUrl).toBe("https://pay.test/x")
    expect(createCheckout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: "order", amountCents: 1000 })
    )
    const order = await db8.orm.public.Order.where({ tenantId: tenant.id }).first()
    expect(order).not.toBeNull()
    expect(order!.totalCents).toBe(1000)
    const lines = await db8.orm.public.OrderLine.where({ tenantId: tenant.id, orderId: order!.id }).all()
    expect(lines).toHaveLength(1)
    expect(lines[0]!.quantity).toBe(2)
  })

  it("a tenant without chargesEnabled cannot checkout", async () => {
    const { variant } = await provision(false)
    await addToCart({ variantId: variant.id })
    const res = await checkoutCart({ name: "Ana" })
    expect(res.error).toBe("forbidden")
  })

  it("orders never cross tenants", async () => {
    const { tenant } = await provision()
    const other = await provision()
    await db8.orm.public.Order.create({ tenantId: other.tenant.id, customerName: "Bia", totalCents: 300 })
    const mine = await db8.orm.public.Order.where({ tenantId: tenant.id }).all()
    expect(mine).toHaveLength(0)
    const theirs = await db8.orm.public.Order.where({ tenantId: other.tenant.id }).all()
    expect(theirs).toHaveLength(1)
  })
})
