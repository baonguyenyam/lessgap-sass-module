import { config } from "dotenv"
import { test, expect, type BrowserContext } from "@playwright/test"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"

// The invitation id travels by email; the test reads it from the database.
config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Task 1.8, the whole way: an owner invites an address from the members page,
 * the invitee opens the link signed out, signs up with that address, comes
 * back to the invitation, accepts, and lands in the owner's tenant.
 */

const password = "correct horse battery staple"

async function signUp(context: BrowserContext, email: string) {
  const page = await context.newPage()
  await page.goto("/signup")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /create account|sign up/i }).click()
  return page
}

async function invitationIdFor(email: string): Promise<string> {
  const { db8 } = await import("@/lib/db8")
  try {
    const row = await db8.orm.public.Invitation.where({ email }).first()
    if (!row) throw new Error(`no invitation for ${email}`)
    return row.id
  } finally {
    await db8.close()
  }
}

test("an owner invites, and the invitee signs up and joins the tenant", async ({ browser }) => {
  const owner = await signUp(await browser.newContext(), freshEmail("owner"))
  await owner.waitForURL(TENANT_HOME, { timeout: 20_000 })
  const home = new URL(owner.url()).pathname

  const invitee = freshEmail("invitee")
  await owner.goto(`${home}/members`)
  await owner.getByRole("button", { name: "Invite member" }).first().click()
  await owner.getByPlaceholder("person@example.com").fill(invitee)
  await owner.getByRole("button", { name: "Save" }).click()
  await expect(owner.getByText(invitee)).toBeVisible({ timeout: 20_000 })

  const id = await invitationIdFor(invitee)
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`/invite/${id}`)
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible()

  await page.getByRole("link", { name: "Create an account" }).click()
  await page.locator('input[name="email"]').fill(invitee)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /create account|sign up/i }).click()
  await page.waitForURL(new RegExp(`/invite/${id}$`), { timeout: 20_000 })

  await page.getByRole("button", { name: "Accept the invitation" }).click()
  await page.waitForURL(new RegExp(`${home}$`), { timeout: 20_000 })
})
