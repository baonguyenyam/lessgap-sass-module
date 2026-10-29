import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"
import { signManageToken } from "@/lib/booking/manage-token"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers({ host: "site.test" }) }
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

const TENANT = "rv-tenant"

async function provision(status: string) {
  await db8.orm.public.Tenant.upsert({
    conflictOn: { id: TENANT },
    create: { id: TENANT, name: "Review Co", slug: "rv", status: "ACTIVE" },
    update: {},
  })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
  const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })
  return db8.orm.public.Appointment.create({
    tenantId: TENANT,
    staffId: staff.id,
    customerId: customer.id,
    startTs: toTs(new Date("2099-12-31T10:00:00Z")),
    endTs: toTs(new Date("2099-12-31T11:00:00Z")),
    status,
  })
}

describe("reviews (11.2)", () => {
  beforeEach(resetDatabase)

  it("a non-completed appointment can't leave one; a completed one's goes pending then publishes", async () => {
    const { submitReview } = await import("@/app/actions/reviews")

    const requested = await provision("requested")
    const blocked = await submitReview({ token: signManageToken(requested.id), rating: 5 })
    expect("error" in blocked ? blocked.error : null).toBe("invalid_input")

    const completed = await provision("completed")
    const submitted = await submitReview({ token: signManageToken(completed.id), rating: 5, body: "Great" })
    expect("error" in submitted ? submitted.error : null).toBeNull()
    const review = await db8.orm.public.Review.where({ appointmentId: completed.id }).first()
    expect(review?.status).toBe("pending")

    // A second review on the same appointment is refused — one per visit.
    const dup = await submitReview({ token: signManageToken(completed.id), rating: 1 })
    expect("error" in dup ? dup.error : null).toBe("invalid_input")
  })

  it("moderateReview publishes a pending one", async () => {
    const { moderateReview } = await import("@/app/actions/reviews")
    const completed = await provision("completed")
    const { submitReview } = await import("@/app/actions/reviews")
    const submitted = await submitReview({ token: signManageToken(completed.id), rating: 4 })
    const id = "id" in submitted && submitted.id ? submitted.id : ""

    // requireTenantContext needs a member — mock it to staff.
    const { requireTenantContext } = await import("@/platform/tenancy/require-member")
    vi.mocked(requireTenantContext).mockResolvedValueOnce({
      user: { id: "u", email: "s", name: "S", image: null },
      member: { role: "OWNER" },
      tenant: { id: TENANT },
      tenantId: TENANT,
    } as never)
    const result = await moderateReview({ id, status: "published" })
    expect(result).toEqual({})
    const review = await db8.orm.public.Review.where({ id }).first()
    expect(review?.status).toBe("published")
  })
})
