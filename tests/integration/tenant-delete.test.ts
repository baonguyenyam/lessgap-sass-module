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
      NewsletterSubscriber,
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

    await Promise.all([
      NewsletterSubscriber.create({
        email: "list@example.test",
        tenantId: tenant.id,
        confirmToken: newTimeId(),
        unsubscribeToken: newTimeId(),
      }),
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
