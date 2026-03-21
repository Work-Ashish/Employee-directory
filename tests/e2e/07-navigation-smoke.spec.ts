import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"

/**
 * Smoke test: navigate to every major route as admin and confirm no crash.
 * This acts as a load/stress test for the rendering pipeline.
 */
const ROUTES = [
  { path: "/", name: "Dashboard" },
  { path: "/employees", name: "Employees" },
  { path: "/teams", name: "Teams" },
  { path: "/attendance", name: "Attendance" },
  { path: "/leave", name: "Leave" },
  { path: "/payroll", name: "Payroll" },
  { path: "/performance", name: "Performance" },
  { path: "/training", name: "Training" },
  { path: "/announcements", name: "Announcements" },
  { path: "/calendar", name: "Calendar" },
  { path: "/help-desk", name: "Help Desk" },
  { path: "/resignation", name: "Resignation" },
  { path: "/admin/assets", name: "Admin Assets" },
  { path: "/admin/documents", name: "Admin Documents" },
  { path: "/admin/integrations", name: "Admin Integrations" },
  { path: "/org-chart", name: "Org Chart" },
  { path: "/settings", name: "Settings" },
  { path: "/profile", name: "Profile" },
]

test.describe("Navigation Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  for (const route of ROUTES) {
    test(`should load ${route.name} (${route.path}) without error`, async ({ page }) => {
      const response = await page.goto(route.path)
      await page.waitForLoadState("networkidle")

      // Should not get a 500 error page
      expect(response?.status()).toBeLessThan(500)

      // Should not show an unhandled error
      const body = await page.locator("body").textContent()
      expect(body).not.toContain("Application error")
      expect(body).not.toContain("Internal Server Error")

      // Should not be redirected to login (session is active)
      await expect(page).not.toHaveURL(/\/login/)
    })
  }
})

test.describe("Sidebar Navigation", () => {
  test("should navigate between pages via sidebar links", async ({ page }) => {
    await login(page)

    // Find sidebar links and click through a few
    const sidebarLinks = page.locator("nav a, aside a, [class*='sidebar'] a, [class*='Sidebar'] a")
    const count = await sidebarLinks.count()

    // Click up to 5 sidebar links
    const max = Math.min(count, 5)
    for (let i = 0; i < max; i++) {
      const link = sidebarLinks.nth(i)
      if (await link.isVisible().catch(() => false)) {
        await link.click()
        await page.waitForLoadState("networkidle")
        await page.waitForTimeout(500)

        // Verify no crash
        const body = await page.locator("body").textContent()
        expect(body).not.toContain("Application error")
      }
    }
  })
})
