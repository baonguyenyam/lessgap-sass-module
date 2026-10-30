import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))
vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>()
  return { ...mod, requireUser: vi.fn() }
})

const TENANT = "nt-tenant"

describe("member notifications (17.1)", () => {
  beforeEach(resetDatabase)

  it("notifyMember writes a row; mark-read clears it", async () => {
    await db8.orm.public.Tenant.create({ id: TENANT, name: "NT", slug: "nt", status: "ACTIVE" })
    await db8.orm.public.User.create({ id: "u1", name: "U", email: "u@x.test" })
    await db8.orm.public.Member.create({ organizationId: TENANT, userId: "u1", role: "owner" })

    const { notifyMember, unreadMemberNotifications } = await import("@/platform/notify/member")
    await notifyMember(TENANT, "order.placed", "New order from Ana", { href: "/t/nt/orders" })
    await notifyMember(TENANT, "booking.created", "New booking from Bo", { userId: "u1" })

    const unread = await unreadMemberNotifications(TENANT, "u1")
    expect(unread.length).toBe(2)

    const { requireUser } = await import("@/lib/auth")
    vi.mocked(requireUser).mockResolvedValue({ id: "u1" } as never)
    const { markNotificationRead, markAllNotificationsRead } = await import("@/app/actions/notifications")

    await markNotificationRead({ id: unread[0].id, tenantId: TENANT })
    expect((await unreadMemberNotifications(TENANT, "u1")).length).toBe(1)

    await markAllNotificationsRead({ tenantId: TENANT })
    expect((await unreadMemberNotifications(TENANT, "u1")).length).toBe(0)
  })

  it("a member's in_app=off category hides the row", async () => {
    await db8.orm.public.Tenant.create({ id: TENANT, name: "NT", slug: "nt2", status: "ACTIVE" })
    await db8.orm.public.User.create({ id: "u2", name: "V", email: "v@x.test" })
    await db8.orm.public.UserSetting.create({ userId: "u2", key: "notify.orders.in_app", value: false })

    const { notifyMember, unreadMemberNotifications } = await import("@/platform/notify/member")
    await notifyMember(TENANT, "order.placed", "New order", { userId: "u2" })
    await notifyMember(TENANT, "booking.created", "New booking", { userId: "u2" })

    const unread = await unreadMemberNotifications(TENANT, "u2")
    expect(unread.map((r) => r.kind)).toEqual(["booking.created"])
  })
})
