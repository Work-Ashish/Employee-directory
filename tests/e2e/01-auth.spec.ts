import { test, expect } from "@playwright/test"
import { login, TEST_TENANT, TEST_EMAIL, TEST_PASSWORD } from "./helpers/auth"

test.describe("Authentication", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("Organization ID").fill(TEST_TENANT)
    await page.getByPlaceholder("Employee ID or Email").fill(TEST_EMAIL)
    await page.getByPlaceholder("Password").fill("WrongPassword!")
    await page.getByRole("button", { name: /login/i }).click()

    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible({ timeout: 10_000 })
  })

  test("should login successfully with valid credentials", async ({ page }) => {
    await login(page)
    // Should NOT be on login page anymore
    await expect(page).not.toHaveURL(/\/login/)
  })

  test("should persist session across page navigations", async ({ page }) => {
    await login(page)
    await page.goto("/employees")
    await page.waitForLoadState("networkidle")
    // Should NOT be redirected back to login
    await expect(page).not.toHaveURL(/\/login/)
  })
})
