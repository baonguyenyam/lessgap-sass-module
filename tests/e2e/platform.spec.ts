import { test, expect, type BrowserContext } from "@playwright/test"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"

/**
 * The platform console (phase 1, task 1.10): only staff — a user with a
 * `platformRole` — opens `/platform` (T10). Inside, staff sees the tenant
 * list, opens a tenant and suspends it; its members are blocked on the next
 * request.
 */

const password = "correct horse battery staple"

async function signUp(context: BrowserContext) {
  const page = await context.newPage()
  await page.goto("/signup")
  const email = freshEmail("platform")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /create account|sign up/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  return { page, email, home: new URL(page.url()).pathname }
}

test("a member without platformRole cannot open /platform (T10)", async ({ browser }) => {
  const { page } = await signUp(await browser.newContext())
  await page.goto("/platform")
  await expect(page).toHaveURL(/\/dashboard/)
})

test("staff lists tenants, opens one and suspends it; its members are then blocked", async ({ browser }) => {
  const { db8 } = await import("@/lib/db8")
  const owner = await signUp(await browser.newContext())
  const slug = owner.home.split("/")[2]

  const staff = await signUp(await browser.newContext())
  await db8.orm.public.User.where({ email: staff.email }).update({ platformRole: "ADMIN" })

  await staff.page.goto("/platform/tenants")
  await expect(staff.page.getByRole("heading", { name: "Tenants" })).toBeVisible()
  await staff.page.locator("tr", { hasText: slug }).getByRole("link").first().click()

  await expect(staff.page.getByRole("button", { name: "Suspend" })).toBeVisible()
  await staff.page.getByRole("button", { name: "Suspend" }).click()
  await staff.page.getByRole("textbox", { name: /reason/i }).fill("E2E suspension")
  await staff.page.getByRole("button", { name: "Save" }).click()
  await expect(staff.page.getByText("Suspended").first()).toBeVisible()

  const response = await owner.page.goto(owner.home)
  await expect(owner.page.getByRole("heading", { name: /page not found/i })).toBeVisible()
  expect(response?.status()).toBe(404)
})

test("staff impersonates a tenant: banner with reason, end restores the console", async ({ browser }) => {
  const { db8 } = await import("@/lib/db8")
  const owner = await signUp(await browser.newContext())
  const slug = owner.home.split("/")[2]

  const staff = await signUp(await browser.newContext())
  await db8.orm.public.User.where({ email: staff.email }).update({ platformRole: "SUPPORT" })

  await staff.page.goto(`/platform/tenants/${slug}`)
  await staff.page.getByRole("button", { name: "Impersonate" }).click()
  await staff.page.getByRole("textbox", { name: /reason/i }).fill("E2E support ticket")
  await staff.page.getByRole("button", { name: "Save" }).click()

  await expect(staff.page).toHaveURL(new RegExp(`/t/${slug}`))
  await expect(staff.page.getByText(/Reason: E2E support ticket/)).toBeVisible()

  await staff.page.getByRole("button", { name: "End impersonation" }).click()
  await expect(staff.page).toHaveURL(/\/platform\/tenants/)
})

test("staff walks the ops pages: a failed job, an email and an error are visible and actionable", async ({
  browser,
}) => {
  const { db8 } = await import("@/lib/db8")
  const { toTs } = await import("@/lib/timestamps")
  const staff = await signUp(await browser.newContext())
  await db8.orm.public.User.where({ email: staff.email }).update({ platformRole: "ADMIN" })

  const kind = `e2e.job.${Date.now()}`
  const digest = `e2e-${Date.now()}`
  const errorName = `E2EError-${Date.now()}`
  await db8.orm.public.Job.create({ kind, status: "FAILED", attempts: 5, lastError: "boom" })
  await db8.orm.public.EmailMessage.create({
    kind: "magic-link",
    toAddress: staff.email,
    subject: "E2E sign-in",
    provider: "none",
    status: "SENT",
    payload: { html: "<p>e2e body</p>" },
    sentAt: toTs(new Date()),
  })
  await db8.orm.public.ErrorReport.create({
    digest,
    source: "action.e2e",
    name: errorName,
    message: "masked",
  })

  await staff.page.goto("/platform/jobs")
  await expect(staff.page.getByRole("heading", { name: "Jobs" })).toBeVisible()
  await expect(staff.page.getByText(kind)).toBeVisible()

  await staff.page.goto("/platform/emails")
  await expect(staff.page.getByRole("heading", { name: "Emails" })).toBeVisible()
  await staff.page.locator("tr", { hasText: "E2E sign-in" }).getByRole("link").first().click()
  await expect(staff.page.getByRole("heading", { name: "E2E sign-in" })).toBeVisible()
  await expect(staff.page.getByRole("button", { name: /resend/i })).toBeVisible()

  await staff.page.goto("/platform/errors")
  await expect(staff.page.getByRole("heading", { name: "Errors" })).toBeVisible()
  await expect(staff.page.getByText(errorName)).toBeVisible({ timeout: 15_000 })

  // Plans (task 2.5): the page lists every plan with its visibility and
  // subscriber count, and the edit drawer names the tenants it reaches.
  const planName = `E2E Plan ${Date.now()}`
  await db8.orm.public.Plan.create({ name: planName, slug: `e2e-${Date.now()}`, price: 100, interval: "MONTH" })
  await staff.page.goto("/platform/plans")
  await expect(staff.page.getByRole("heading", { name: "Plans" })).toBeVisible()
  await expect(staff.page.getByText(planName)).toBeVisible()
})
