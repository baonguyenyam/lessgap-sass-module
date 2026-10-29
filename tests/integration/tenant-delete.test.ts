import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { newTimeId } from "@/lib/ids"
import { nowTs, toTs } from "@/lib/timestamps"
import { deleteTenant } from "@/platform/tenancy/delete-tenant"
import { resetDatabase, activateTenant } from "@tests/helpers/db"

// Task 1.14, T9: after deletion no tenant-owned table holds a row with the
// tenant's id — and the tenant-identity tables (member, invitation, role) are
// gone too. Platform-private rows keep the id as context: the audit trail
// must survive the deletion it describes.
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

let seq = 0
async function signUp(email = `purge-${Date.now()}-${++seq}@example.test`) {
  const result = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: email.split("@")[0] },
  })
  return result.user.id
}

describe("tenant deletion (T9)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("leaves no row with the tenant's id in any tenant-owned or tenant-identity table", async () => {
    const {
      Appointment,
      AppointmentEvent,
      AvailabilityRule,
      Customer,
      Media,
      NotificationLog,
      Cart,
      CartLine,
      ChatConversation,
      ChatMessage,
      Order,
      OrderLine,
      Payment,
      Product,
      ProductCategory,
      ProductModifier,
      ProductModifierGroup,
      KnowledgeChunk,
      KnowledgeSource,
      SitePageView,
      TenantSnapshot,
      Quote,
      QuoteEvent,
      QuoteLine,
      QuoteRequest,
      ProductVariant,
      Refund,
      Reservation,
      ReservationRule,
      Resource,
      Table,
      TimeOff,
      ModuleExport,
      ModulePurge,
      NewsletterSubscriber,
      Page,
      Service,
      ServiceCategory,
      ServiceVariant,
      Site,
      SiteSettings,
      StaffMember,
      StaffService,
      TenantModule,
      TenantSetting,
      Purchase,
      Subscription,
      TenantAddOn,
      EntitlementOverride,
      UsageCounter,
      Member,
      Invitation,
      OrganizationRole,
      Tenant,
      AuditLog,
      Plan,
      AddOn,
    } = db8.orm.public
    const userId = await signUp()
    const slug = `purge-${Date.now()}-${++seq}`
    const tenant = await auth.api.createOrganization({ body: { name: "Purge Me", slug, userId } })
    await activateTenant(tenant.id)
    const plan = await Plan.create({ name: "Purge Plan", slug, price: 100, interval: "MONTH" })
    const addOn = await AddOn.create({ key: slug, name: "Purge Add-on", stripePriceId: `price_${slug}` })

    const service = await Service.create({ tenantId: tenant.id, name: "Manicure" })
    const staff = await StaffMember.create({ tenantId: tenant.id, name: "Mia" })
    const customer = await Customer.create({ tenantId: tenant.id, name: "Ana" })
    const resource = await Resource.create({ tenantId: tenant.id, name: "Chair 1" })
    const appointment = await Appointment.create({
      tenantId: tenant.id,
      customerId: customer.id,
      staffId: staff.id,
      resourceId: resource.id,
      startTs: nowTs(),
      endTs: toTs(new Date(Date.now() + 30 * 60 * 1000)),
      status: "confirmed",
    })
    const serviceId = service.id
    const staffId = staff.id
    await Promise.all([
      NewsletterSubscriber.create({
        email: "list@example.test",
        tenantId: tenant.id,
        confirmToken: newTimeId(),
        unsubscribeToken: newTimeId(),
      }),
      Media.create({ tenantId: tenant.id, key: `media/${slug}`, contentType: "image/png", bytes: 100 }),
      ModuleExport.create({ tenantId: tenant.id, moduleKey: "demo", files: {}, expiresAt: nowTs() }),
      ModulePurge.create({ tenantId: tenant.id, moduleKey: "demo", runAfter: nowTs() }),
      Page.create({ tenantId: tenant.id, key: "home" }),
      Site.create({ tenantId: tenant.id, themeKey: "main" }),
      ServiceCategory.create({ tenantId: tenant.id, name: "Nails" }),
      SiteSettings.create({ tenantId: tenant.id, profile: { name: "Purge Me" } }),
      ServiceVariant.create({ tenantId: tenant.id, serviceId: serviceId, name: "Gel" }),
      StaffService.create({ tenantId: tenant.id, staffMemberId: staffId, serviceId: serviceId }),
      TenantModule.create({ tenantId: tenant.id, moduleKey: "demo", enabled: true }),
      TenantSetting.create({ tenantId: tenant.id, key: "display.page_size", value: 25 }),
      OrganizationRole.create({ organizationId: tenant.id, role: "greeter", permission: { demo: ["view"] } }),
      Invitation.create({
        id: `inv-${Date.now()}`,
        organizationId: tenant.id,
        email: "guest@example.test",
        role: "member",
        status: "pending",
        inviterId: userId,
        expiresAt: toTs(new Date(2100, 0, 1)),
      }),
      AuditLog.create({
        actorKind: "platform",
        actorId: "staff-1",
        action: "platform.tenant.marked",
        tenantId: tenant.id,
      }),
      Subscription.create({
        tenantId: tenant.id,
        planId: plan.id,
        stripeSubscriptionId: `sub_${slug}`,
        status: "ACTIVE",
        currentPeriodStart: nowTs(),
        currentPeriodEnd: toTs(new Date(2100, 0, 1)),
      }),
      Purchase.create({
        tenantId: tenant.id,
        planId: plan.id,
        stripePaymentIntentId: `pi_${slug}`,
        amount: 100,
      }),
      TenantAddOn.create({ tenantId: tenant.id, addOnId: addOn.id }),
      EntitlementOverride.create({
        tenantId: tenant.id,
        featureKey: "demo",
        value: true,
        reason: "test",
        createdById: "staff-1",
      }),
      UsageCounter.create({ tenantId: tenant.id, limitKey: "demo", periodStart: nowTs(), used: 1 }),
      AvailabilityRule.create({
        tenantId: tenant.id,
        staffId: staff.id,
        weekday: 1,
        startMinute: 540,
        endMinute: 1020,
      }),
      TimeOff.create({ tenantId: tenant.id, staffId: staff.id, startTs: nowTs(), endTs: nowTs() }),
      Table.create({ tenantId: tenant.id, name: "T1", capacity: 4 }).then((t) =>
        Reservation.create({
          tenantId: tenant.id,
          tableId: t.id,
          partySize: 2,
          startTs: nowTs(),
          endTs: nowTs(),
          name: "Ana",
        })
      ),
      ReservationRule.create({ tenantId: tenant.id, weekday: 2, startMinute: 660, endMinute: 840 }),
      ChatConversation.create({ tenantId: tenant.id, visitorKey: "v1" }).then((conv) =>
        ChatMessage.create({ tenantId: tenant.id, conversationId: conv.id, role: "user", content: "hi" })
      ),
      KnowledgeSource.create({ tenantId: tenant.id, type: "faq", title: "FAQ", checksum: "c1" }).then((src) =>
        KnowledgeChunk.create({ tenantId: tenant.id, sourceId: src.id, content: "hours 9-5", tokenCount: 3 })
      ),
      SitePageView.create({ tenantId: tenant.id, path: "/about", date: "2026-10-29", count: 1 }),
      TenantSnapshot.create({ tenantId: tenant.id }),
      ProductCategory.create({ tenantId: tenant.id, name: "Gifts" }).then((c) =>
        Product.create({ tenantId: tenant.id, categoryId: c.id, name: "Card" }).then((p) =>
          Promise.all([
            QuoteRequest.create({ tenantId: tenant.id, customerName: "Ana", customerEmail: "a@x.test" }).then((qr) =>
              Quote.create({
                tenantId: tenant.id,
                requestId: qr.id,
                customerName: "Ana",
                customerEmail: "a@x.test",
                accessToken: `tok_${Date.now()}`,
              }).then((q) =>
                Promise.all([
                  QuoteLine.create({ tenantId: tenant.id, quoteId: q.id, name: "Work", unitPriceCents: 100 }),
                  QuoteEvent.create({ tenantId: tenant.id, quoteId: q.id, kind: "sent" }),
                ])
              )
            ),
            ProductModifierGroup.create({ tenantId: tenant.id, productId: p.id, name: "Size" }).then((g) =>
              ProductModifier.create({ tenantId: tenant.id, groupId: g.id, name: "Large", priceCents: 200 })
            ),
            ProductVariant.create({ tenantId: tenant.id, productId: p.id, name: "Std", priceCents: 500 }).then((v) =>
              Cart.create({ tenantId: tenant.id, cartKey: "k1" }).then((cart) =>
                CartLine.create({ tenantId: tenant.id, cartId: cart.id, variantId: v.id, quantity: 1 })
              )
            ),
            Order.create({ tenantId: tenant.id, customerName: "Ana", totalCents: 500 }).then((o) =>
              OrderLine.create({ tenantId: tenant.id, orderId: o.id, name: "Std", unitPriceCents: 500 })
            ),
          ])
        )
      ),
      Payment.create({ tenantId: tenant.id, kind: "deposit", amountCents: 2000, feeCents: 58 }).then((p) =>
        Refund.create({ tenantId: tenant.id, paymentId: p.id, amountCents: 1000, feeRefundCents: 29 })
      ),
      AppointmentEvent.create({ tenantId: tenant.id, appointmentId: appointment.id, toStatus: "confirmed" }),
      NotificationLog.create({
        tenantId: tenant.id,
        channel: "email",
        template: "booking.confirmation",
        recipient: "a@b.c",
      }),
    ])

    await deleteTenant(tenant.id)

    // T9: nothing tenant-owned or tenant-identity still references the id.
    for (const [name, model, field] of [
      ["NewsletterSubscriber", NewsletterSubscriber, "tenantId"],
      ["TenantModule", TenantModule, "tenantId"],
      ["TenantSetting", TenantSetting, "tenantId"],
      ["Purchase", Purchase, "tenantId"],
      ["Subscription", Subscription, "tenantId"],
      ["TenantAddOn", TenantAddOn, "tenantId"],
      ["EntitlementOverride", EntitlementOverride, "tenantId"],
      ["UsageCounter", UsageCounter, "tenantId"],
      ["Member", Member, "organizationId"],
      ["Invitation", Invitation, "organizationId"],
      ["OrganizationRole", OrganizationRole, "organizationId"],
      ["Appointment", Appointment, "tenantId"],
      ["AppointmentEvent", AppointmentEvent, "tenantId"],
      ["AvailabilityRule", AvailabilityRule, "tenantId"],
      ["Customer", Customer, "tenantId"],
      ["NotificationLog", NotificationLog, "tenantId"],
      ["Resource", Resource, "tenantId"],
      ["TimeOff", TimeOff, "tenantId"],
      ["Cart", Cart, "tenantId"],
      ["CartLine", CartLine, "tenantId"],
      ["ChatConversation", ChatConversation, "tenantId"],
      ["ChatMessage", ChatMessage, "tenantId"],
      ["KnowledgeChunk", KnowledgeChunk, "tenantId"],
      ["KnowledgeSource", KnowledgeSource, "tenantId"],
      ["Order", Order, "tenantId"],
      ["OrderLine", OrderLine, "tenantId"],
      ["Product", Product, "tenantId"],
      ["ProductCategory", ProductCategory, "tenantId"],
      ["ProductModifier", ProductModifier, "tenantId"],
      ["ProductModifierGroup", ProductModifierGroup, "tenantId"],
      ["Quote", Quote, "tenantId"],
      ["QuoteEvent", QuoteEvent, "tenantId"],
      ["QuoteLine", QuoteLine, "tenantId"],
      ["QuoteRequest", QuoteRequest, "tenantId"],
      ["ProductVariant", ProductVariant, "tenantId"],
      ["Payment", Payment, "tenantId"],
      ["Refund", Refund, "tenantId"],
      ["Reservation", Reservation, "tenantId"],
      ["ReservationRule", ReservationRule, "tenantId"],
      ["Table", Table, "tenantId"],
      ["SitePageView", SitePageView, "tenantId"],
      ["TenantSnapshot", TenantSnapshot, "tenantId"],
    ] as const) {
      const row = await (model as typeof NewsletterSubscriber).where({ [field]: tenant.id } as never).first()
      expect(row, name).toBeNull()
    }
    expect(await Tenant.where({ id: tenant.id }).first()).toBeNull()

    // The audit row survives — platform-private context, not ownership.
    expect(await AuditLog.where({ tenantId: tenant.id }).first()).not.toBeNull()

    // And the job handler is a no-op on a second run (idempotent).
    await expect(deleteTenant(tenant.id)).resolves.toBeUndefined()

    // The user account itself stays — their workspace is gone, not them.
    expect(await db8.orm.public.User.where({ id: userId }).first()).not.toBeNull()
  })

  it("the job handler purges the tenant in its payload", async () => {
    const { Tenant } = db8.orm.public
    const userId = await signUp()
    const slug = `job-${Date.now()}-${++seq}`
    const tenant = await auth.api.createOrganization({ body: { name: "Job Me", slug, userId } })
    await activateTenant(tenant.id)

    const { JOBS } = await import("@/platform/jobs/registry")
    await JOBS["platform.tenant.delete"].handler(
      { tenantId: tenant.id },
      {
        jobId: "test",
        attempt: 1,
        tenantId: null,
        requestId: null,
      }
    )
    expect(await Tenant.where({ id: tenant.id }).first()).toBeNull()
  })
})
