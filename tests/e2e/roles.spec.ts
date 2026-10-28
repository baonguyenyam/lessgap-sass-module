import { test, expect } from "@playwright/test"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"

/**
 * Task 1.8b: an owner creates a custom role ("nhóm quyền") by ticking
 * permissions grouped by area, and it appears in the list with them.
 */

test("an owner creates a custom role from grouped permissions", async ({ page }) => {
  await page.goto("/signup")
  await page.locator('input[name="email"]').fill(freshEmail("roles"))
  await page.locator('input[name="password"][type="password"]').fill("correct horse battery staple")
  await page.getByRole("button", { name: /create account|sign up/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  const home = new URL(page.url()).pathname

  await page.goto(`${home}/roles`)
  await page.getByRole("button", { name: "Create a role" }).first().click()
  await page.getByPlaceholder("role-name").fill("front-desk")
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Bookings and customers")).toBeVisible()
  await dialog.getByRole("group", { name: "Bookings", exact: true }).getByRole("checkbox").nth(1).check()
  await dialog.getByRole("button", { name: "Save" }).click()

  const row = page.getByRole("row", { name: /front-desk/ })
  await expect(row).toBeVisible({ timeout: 20_000 })
  await expect(row).toContainText("Bookings: Manage")
})
