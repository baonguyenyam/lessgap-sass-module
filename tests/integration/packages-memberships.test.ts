import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})

const TENANT = "pm-tenant"

async function provision() {
  await db8.orm.public.Tenant.upsert({
    conflictOn: { id: TENANT },
    create: { id: TENANT, name: "P&M Co", slug: "pm", status: "ACTIVE" },
    update: {},
  })
  await db8.orm.public.TenantModule.create({ tenantId: TENANT, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.booking" },
    create: { key: "module.booking", value: true, updatedById: "test" },
    update: { value: true },
  })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
  const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })
  const appointment = await db8.orm.public.Appointment.create({
    tenantId: TENANT,
    staffId: staff.id,
    customerId: customer.id,
    startTs: toTs(new Date("2099-12-31T10:00:00Z")),
    endTs: toTs(new Date("2099-12-31T11:00:00Z")),
    status: "completed",
  })
  return { customer, appointment }
}

describe("packages & memberships (12.2)", () => {
  beforeEach(resetDatabase)

  it("a package debits sessions when spent and an empty one stops", async () => {
    const { requireTenantContext } = await import("@/platform/tenancy/require-member")
    vi.mocked(requireTenantContext).mockResolvedValue({
      user: { id: "u" },
      member: { role: "OWNER" },
      tenant: { id: TENANT },
      tenantId: TENANT,
    } as never)
    const { buyPackage, spendPackage } = await import("@/app/actions/packages-memberships")
    const { customer, appointment } = await provision()

    const pkg = await db8.orm.public.Package.create({
      tenantId: TENANT,
      name: "5 sessions",
      sessions: 1,
      priceCents: 20000,
    })
    const bought = await buyPackage({ packageId: pkg.id, customerId: customer.id })
    const id = "id" in bought && bought.id ? bought.id : ""
    expect(id).not.toBe("")

    const spent = await spendPackage({ holdingId: id, appointmentId: appointment.id })
    expect("error" in spent ? spent.error : null).toBeNull()
    const holding = await db8.orm.public.CustomerPackage.where({ id }).first()
    expect(holding?.sessionsLeft).toBe(0)
    const ledger = await db8.orm.public.PackageLedger.where({ holdingId: id }).all()
    expect(ledger.reduce((s, l) => s + l.deltaSessions, 0)).toBe(0)

    const empty = await spendPackage({ holdingId: id, appointmentId: appointment.id })
    expect("error" in empty ? empty.error : null).toBe("conflict")
  })

  it("a membership activates and bills monthly", async () => {
    const { requireTenantContext } = await import("@/platform/tenancy/require-member")
    vi.mocked(requireTenantContext).mockResolvedValue({
      user: { id: "u" },
      member: { role: "OWNER" },
      tenant: { id: TENANT },
      tenantId: TENANT,
    } as never)
    const { activateMembership, billMembership } = await import("@/app/actions/packages-memberships")
    const { customer } = await provision()

    const membership = await db8.orm.public.Membership.create({ tenantId: TENANT, name: "Member", priceCents: 5000 })
    const activated = await activateMembership({ membershipId: membership.id, customerId: customer.id })
    const id = "id" in activated && activated.id ? activated.id : ""
    expect(id).not.toBe("")

    const billed = await billMembership({ holdingId: id })
    expect("error" in billed ? billed.error : null).toBeNull()
    const ledger = await db8.orm.public.MembershipLedger.where({ holdingId: id }).all()
    expect(ledger.length).toBe(2)
    expect(ledger[0].reason).toBe("joined")
    expect(ledger[1].reason).toBe("billed")
  })
})
