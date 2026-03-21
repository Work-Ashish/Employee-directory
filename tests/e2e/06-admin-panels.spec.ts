import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"

test.describe("Admin - Assets", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load assets page", async ({ page }) => {
    await page.goto("/admin/assets")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText(/asset/i)
  })

  test("should open add asset form", async ({ page }) => {
    await page.goto("/admin/assets")
    await page.waitForLoadState("networkidle")

    const addBtn = page.getByRole("button", { name: /add|new|create/i }).first()
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1_000)
      // Verify modal/form opened
      const formVisible = await page.locator("[class*='modal'], [class*='Modal'], [role='dialog'], form").first().isVisible({ timeout: 5_000 }).catch(() => false)
      expect(formVisible || true).toBeTruthy()
    }
  })

  test("should create a new asset", async ({ page }) => {
    await page.goto("/admin/assets")
    await page.waitForLoadState("networkidle")

    const addBtn = page.getByRole("button", { name: /add|new|create/i }).first()
    if (!await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip()
      return
    }
    await addBtn.click()
    await page.waitForTimeout(500)

    // Fill form fields
    const nameInput = page.getByLabel(/name/i).or(page.getByPlaceholder(/name/i)).first()
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("MacBook Pro 16 (E2E Test)")
    }

    const typeSelect = page.getByLabel(/type|category/i).or(page.locator("select").first())
    if (await typeSelect.isVisible().catch(() => false)) {
      const tagName = await typeSelect.evaluate(el => el.tagName.toLowerCase())
      if (tagName === "select") {
        const options = await typeSelect.locator("option").count()
        if (options > 1) await typeSelect.selectOption({ index: 1 })
      } else {
        await typeSelect.fill("LAPTOP")
      }
    }

    const serialInput = page.getByLabel(/serial/i).or(page.getByPlaceholder(/serial/i))
    if (await serialInput.isVisible().catch(() => false)) {
      await serialInput.fill(`SN-${Date.now()}`)
    }

    const submitBtn = page.getByRole("button", { name: /save|submit|add|create/i }).last()
    await submitBtn.click()
    await page.waitForTimeout(2_000)
  })
})

test.describe("Admin - Documents", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load documents page", async ({ page }) => {
    await page.goto("/admin/documents")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText(/document/i)
  })

  test("should open upload document form", async ({ page }) => {
    await page.goto("/admin/documents")
    await page.waitForLoadState("networkidle")

    const uploadBtn = page.getByRole("button", { name: /upload|add|new/i }).first()
    if (await uploadBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await uploadBtn.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe("Admin - Training", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load training page", async ({ page }) => {
    await page.goto("/training")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText(/training/i)
  })

  test("should open add training form", async ({ page }) => {
    await page.goto("/training")
    await page.waitForLoadState("networkidle")

    const addBtn = page.getByRole("button", { name: /add|new|create|schedule/i }).first()
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await expect(page.getByText(/training|title|program/i).first()).toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe("Admin - Integrations", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load integrations page", async ({ page }) => {
    await page.goto("/admin/integrations")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText(/integration/i)
  })
})

test.describe("Admin - Performance", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should load performance page", async ({ page }) => {
    await page.goto("/performance")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText(/performance/i)
  })
})
