import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

/**
 * Which requests read the session (2.3.6).
 *
 * The proxy used to read it on every request, public pages included. Nothing
 * failed: the pages were right, the redirects were right, and the only sign
 * was the CPU bill on Vercel. A test is the only place that regression shows.
 */

const getSession = vi.fn()
const intl = vi.fn(() => NextResponse.next({ headers: { "x-intl": "1" } }))

vi.mock("@/auth", () => ({
  auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } },
}))
vi.mock("next-intl/middleware", () => ({ default: () => intl }))
vi.mock("@/i18n/routing", () => ({ routing: {} }))
const isTenantMember = vi.fn()
vi.mock("@/platform/tenancy/require-member", () => ({
  isTenantMember: (...a: unknown[]) => isTenantMember(...a),
}))
// Host resolution (3.1) is covered by host.test.ts — these tests exercise the
// proxy's redirect logic on the app host.
vi.mock("@/platform/tenancy/host", () => ({ resolveHost: async () => ({ kind: "platform" }) }))

const { default: proxy } = await import("@/proxy")

const run = (path: string) => proxy(new NextRequest(new URL(path, "http://localhost")))
const location = (res: Response) => res.headers.get("location")

beforeEach(() => {
  getSession.mockReset()
  isTenantMember.mockReset()
  intl.mockClear()
})

describe("proxy: the session is read only where it is used", () => {
  it.each(["/", "/it", "/changelog", "/pricing", "/api/auth/session", "/sitemap.xml"])(
    "%s does not read it",
    async (path) => {
      await run(path)
      expect(getSession).not.toHaveBeenCalled()
    }
  )

  it.each(["/login", "/2fa", "/dashboard", "/dashboard/settings", "/admin", "/api/billing/portal"])(
    "%s reads it",
    async (path) => {
      getSession.mockResolvedValue(null)
      await run(path)
      expect(getSession).toHaveBeenCalledOnce()
    }
  )
})

describe("proxy: the redirects are unchanged", () => {
  it("sends a signed-out visitor from /dashboard to /login", async () => {
    getSession.mockResolvedValue(null)
    expect(location(await run("/dashboard"))).toBe("http://localhost/login")
  })

  it("sends a signed-in user from /login to /dashboard", async () => {
    getSession.mockResolvedValue({ user: { role: "USER" } })
    expect(location(await run("/login"))).toBe("http://localhost/dashboard")
  })

  it("keeps a non-admin out of /admin", async () => {
    getSession.mockResolvedValue({ user: { role: "USER" } })
    expect(location(await run("/admin"))).toBe("http://localhost/dashboard")
  })

  it("keeps an ADMIN out of /admin — the area is ROOT-only", async () => {
    getSession.mockResolvedValue({ user: { role: "ADMIN" } })
    expect(location(await run("/admin"))).toBe("http://localhost/dashboard")
  })

  it("lets ROOT into /admin", async () => {
    getSession.mockResolvedValue({ user: { role: "ROOT" } })
    expect(location(await run("/admin"))).toBeNull()
  })

  it("hands public pages to the locale middleware", async () => {
    const res = await run("/pricing")
    expect(intl).toHaveBeenCalledOnce()
    expect(res.headers.get("x-intl")).toBe("1")
  })
})

describe("proxy: tenant dashboards (task 1.7)", () => {
  const member = { user: { id: "u1", role: "USER" } }

  it("answers a real 404 to someone outside the tenant, before the page streams (T6)", async () => {
    getSession.mockResolvedValue(member)
    isTenantMember.mockResolvedValue(false)
    const res = await run("/t/acme/projects")
    expect(isTenantMember).toHaveBeenCalledWith("u1", "acme")
    expect(res.status).toBe(404)
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://localhost/_not-found")
  })

  it("lets a member in and remembers the tenant for /dashboard", async () => {
    getSession.mockResolvedValue(member)
    isTenantMember.mockResolvedValue(true)
    const res = await run("/t/acme")
    expect(res.status).toBe(200)
    expect(res.cookies.get("last_tenant")?.value).toBe("acme")
  })

  it("sends a signed-out visitor to /login without looking the tenant up", async () => {
    getSession.mockResolvedValue(null)
    expect(location(await run("/t/acme"))).toBe("http://localhost/login")
    expect(isTenantMember).not.toHaveBeenCalled()
  })
})

describe("proxy: invitation links (task 1.8)", () => {
  it("remembers an invitation opened signed out, without asking for a session", async () => {
    const res = await run("/invite/abc123")
    expect(location(res)).toBeNull()
    expect(res.cookies.get("pending_invitation")?.value).toBe("abc123")
    expect(intl).not.toHaveBeenCalled()
  })
})
