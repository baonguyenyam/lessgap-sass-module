import { test, expect, type BrowserContext } from "@playwright/test"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"

/**
 * The dashboard lives under `/t/<slug>` (phase 1, task 1.7). Two accounts,
 * each with the tenant signing up gives it: `/dashboard` lands each on its
 * own, and neither can open the other's (T6). A 404, not a 403, so a stranger
 * cannot tell the tenant exists.
 */

const password = "correct horse battery staple"

async function signUp(context: BrowserContext) {
  const page = await context.newPage()
  await page.goto("/signup")
  await page.locator('input[name="email"]').fill(freshEmail("tenant"))
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /create account|sign up/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  return { page, home: new URL(page.url()).pathname }
}

test("each account lands on its own tenant, and a member of A gets 404 on B (T6)", async ({ browser }) => {
  const a = await signUp(await browser.newContext())
  const b = await signUp(await browser.newContext())
  expect(a.home).not.toBe(b.home)

  // `/dashboard` and the old deep links still work: they redirect into the tenant.
  await a.page.goto("/dashboard/projects")
  await expect(a.page).toHaveURL(new RegExp(`${a.home}/projects$`))

  const response = await b.page.goto(`${a.home}/projects`)
  expect(response?.status()).toBe(404)
})
