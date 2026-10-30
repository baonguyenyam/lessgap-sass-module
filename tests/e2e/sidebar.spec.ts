import { test, expect, type BrowserContext } from "@playwright/test"
import { config } from "dotenv"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * The dashboard menu offers only what the member may open: every item names
 * the permission its page checks. An owner sees billing and members; a staff
 * member of the same tenant sees neither, and a page the menu hides still
 * turns them away when typed in.
 */

const password = "correct horse battery staple"

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
let auth: Awaited<typeof import("@/auth")>["auth"]
test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
  auth = (await import("@/auth")).auth
})
// db8 is a worker-wide singleton: never closed in a spec (lessons).

async function signIn(context: BrowserContext, email: string) {
  const page = await context.newPage()
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  return page
}

test("the sidebar follows the member's permissions", async ({ browser }) => {
  const ownerEmail = freshEmail("sidebar-owner")
  const staffEmail = freshEmail("sidebar-staff")
  const slug = `e2e-nav-${newId().slice(0, 8).toLowerCase()}`
  const { user: owner } = await auth.api.signUpEmail({ body: { email: ownerEmail, password, name: "Owner" } })
  const { user: staff } = await auth.api.signUpEmail({ body: { email: staffEmail, password, name: "Staff" } })
  const tenant = await auth.api.createOrganization({ body: { name: "E2E Nav", slug, userId: owner.id } })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  // The plugin's types know only its default roles; "staff" is one of ours.
  await auth.api.addMember({ body: { userId: staff.id, organizationId: tenant.id, role: "staff" as "member" } })

  const ownerPage = await signIn(await browser.newContext(), ownerEmail)
  await ownerPage.goto(`/t/${slug}`)
  const ownerNav = ownerPage.locator('[data-sidebar="content"]')
  await expect(ownerNav.getByRole("link", { name: "Billing" })).toBeVisible()
  await expect(ownerNav.getByRole("link", { name: "Members" })).toBeVisible()

  const staffPage = await signIn(await browser.newContext(), staffEmail)
  await staffPage.goto(`/t/${slug}`)
  const staffNav = staffPage.locator('[data-sidebar="content"]')
  await expect(staffNav.getByRole("link", { name: "Account" })).toBeVisible()
  await expect(staffNav.getByRole("link", { name: "Billing" })).toHaveCount(0)
  await expect(staffNav.getByRole("link", { name: "Members" })).toHaveCount(0)

  // Hidden from the menu, and refused when typed in: billing.manage only.
  await staffPage.goto(`/t/${slug}/billing`).catch(() => {})
  await expect(staffPage).not.toHaveURL(/\/billing$/)
})
