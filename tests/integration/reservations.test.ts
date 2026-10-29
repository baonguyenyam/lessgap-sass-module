import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "site.test" }) }))
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})

const { reserveTable } = await import("@/app/actions/reservations")
const { resolveHost } = await import("@/platform/tenancy/host")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `res-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "R",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "ResCo", slug: `res-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "reservations", enabled: true })
  await db8.orm.public.PlatformSwitch.create({ key: "module.reservations", value: true, updatedById: "test" })
  const table = await db8.orm.public.Table.create({ tenantId: tenant.id, name: "T4", capacity: 4 })
  await db8.orm.public.ReservationRule.create({
    tenantId: tenant.id,
    weekday: 2, // Tuesday — March 9 2027 is a Tuesday.
    startMinute: 11 * 60,
    endMinute: 14 * 60,
    slotMinutes: 90,
    turnMinutes: 15,
    minPartySize: 1,
    maxPartySize: 8,
  })
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: tenant.slug })
  return { tenant, table }
}

describe("reservations (5.8)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("reserves an open slot, and a second reservation on it is refused", async () => {
    const { tenant, table } = await provision()
    const res = await reserveTable({
      tableId: table.id,
      partySize: 4,
      startTs: "2027-03-09T11:00:00.000Z",
      endTs: "2027-03-09T12:30:00.000Z",
      name: "Ana",
      phone: "+15550100",
    })
    expect(res.error).toBeUndefined()
    const row = await db8.orm.public.Reservation.where({ tenantId: tenant.id }).first()
    expect(row).not.toBeNull()
    expect(row!.partySize).toBe(4)
    const second = await reserveTable({
      tableId: table.id,
      partySize: 2,
      startTs: "2027-03-09T12:30:00.000Z", // inside the first's turn time
      endTs: "2027-03-09T14:00:00.000Z",
      name: "Bia",
    })
    expect(second.error).toBe("conflict")
  })

  it("a party bigger than the rule allows is refused", async () => {
    const { table } = await provision()
    const res = await reserveTable({
      tableId: table.id,
      partySize: 10,
      startTs: "2027-03-09T11:00:00.000Z",
      endTs: "2027-03-09T12:30:00.000Z",
      name: "Big",
    })
    expect(res.error).toBe("conflict")
  })
})
