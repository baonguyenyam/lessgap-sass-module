import { test } from "@playwright/test"
import { config } from "dotenv"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"
import { newId } from "@/lib/ids"
config({ path: ".env.local" })
config({ path: ".env" })
test("empties", async ({ page }) => {
  test.setTimeout(180000)
  const { auth } = await import("@/auth")
  const { db8 } = await import("@/lib/db8")
  const pw = "correct horse battery staple"
  const email = freshEmail("shot")
  const slug = "e2e-shot-" + newId().slice(0, 8).toLowerCase()
  const { user } = await auth.api.signUpEmail({ body: { email, password: pw, name: "Linh Tran" } })
  const tenant = await auth.api.createOrganization({ body: { name: "Shot Studio", slug, userId: user.id } })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  for (const key of ["booking","newsletter","payments","shop"]) await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: key, enabled: true })
  await page.setViewportSize({ width: 1280, height: 700 })
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(pw)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20000 })
  for (const p of ["newsletter", "calendar", "orders"]) {
    await page.goto("/t/" + slug + "/" + p); await page.waitForTimeout(1500)
    await page.screenshot({ path: "/private/tmp/claude-501/-Users-nguyenpham-Source-Code-lessgap-sass-module/0c53748b-9c26-4859-bee3-7c30f9c01578/scratchpad/e2-" + p + ".png" })
  }
})
