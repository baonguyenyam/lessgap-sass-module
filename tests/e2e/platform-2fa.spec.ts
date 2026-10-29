import { test, expect, type BrowserContext } from "@playwright/test"
import { config } from "dotenv"
import { freshEmail } from "./fresh-email"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Platform 2FA gate (task 10.2, O8): a staff member without
 * `twoFactorEnabled` is refused `/platform` — sent to the 2FA setup — until
 * it's on. `requirePlatformRole` enforces it; the spec walks both sides.
 */

const password = "correct horse battery staple"

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
let auth: Awaited<typeof import("@/auth")>["auth"]
test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
  auth = (await import("@/auth")).auth
})
// db8 is a globalThis singleton shared across specs in the
// worker — closing it here leaves the next spec with a dead
// client. The process exit cleans connections.

async function staffUser(context: BrowserContext) {
  const email = freshEmail("staff")
  const { user } = await auth.api.signUpEmail({ body: { email, password, name: "E2E Staff" } })
  // Staff belong to a tenant too — without a member row the member check
  // on the parent layout bounces to /onboarding before the 2FA gate runs.
  // (PlatformRole goes on AFTER createOrganization — the org write
  // re-saves the User and a field set earlier is lost.)
  await auth.api.createOrganization({
    body: { name: "E2E Staff Org", slug: `e2e-staff-${newId().slice(0, 6).toLowerCase()}`, userId: user.id },
  })
  await db8.orm.public.User.where({ id: user.id }).update({ platformRole: "SUPPORT" })
  const page = await context.newPage()
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(dashboard|t\/|onboarding)/, { timeout: 20_000 })
  return { page, user }
}

test("staff without 2FA is refused /platform until it's on", async ({ context }) => {
  const { page, user } = await staffUser(context)

  // 2FA ON first — opens the console, isolating the 2FA gate from the
  // platformRole check (staffUser reads its platformRole back as SUPPORT).
  await db8.orm.public.User.where({ id: user.id }).update({ twoFactorEnabled: true })
  await page.goto("/platform").catch(() => {})
  await page.waitForURL(/\/platform/, { timeout: 20_000 })
  expect(page.url()).toContain("/platform")

  // 2FA OFF — the layout's redirect fires as an RSC redirect, which aborts
  // the goto mid-flight; the post-redirect navigation is what the URL
  // check needs.
  await db8.orm.public.User.where({ id: user.id }).update({ twoFactorEnabled: false })
  await page.goto("/platform").catch(() => {})
  await page.waitForURL(/\/dashboard\/account\/security/, { timeout: 20_000 })
  expect(page.url()).toContain("/dashboard/account/security")
})
