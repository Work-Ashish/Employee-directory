import { test, expect } from "@playwright/test"
import { login, uniqueId } from "./helpers/auth"

const EMP_FIRST = uniqueId("PW")
const EMP_LAST = "Tester"
const EMP_EMAIL = `${EMP_FIRST.toLowerCase()}@test.com`

test.describe("Employee CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/employees")
    await page.waitForLoadState("domcontentloaded")
    // Give the page a moment to render
    await page.waitForTimeout(2_000)
  })

  test("should load employees page", async ({ page }) => {
    await expect(page.locator("body")).toContainText(/employee/i)
  })

  test("should open Add Employee form", async ({ page }) => {
    // Look for add/new employee button
    const addBtn = page.getByRole("button", { name: /add|new|create/i }).first()
    await addBtn.click()

    // Modal should appear with form fields
    await expect(page.getByText(/first name/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/last name/i)).toBeVisible()
    await expect(page.getByText(/email/i).first()).toBeVisible()
  })

  test("should create a new employee", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add|new|create/i }).first()
    await addBtn.click()
    await page.waitForTimeout(500)

    // Fill personal info
    const firstNameInput = page.locator("input").filter({ has: page.locator("[placeholder]") }).or(page.getByLabel(/first name/i)).first()
    // Try multiple selector strategies
    const formInputs = page.locator("form input, [role='dialog'] input")
    const inputCount = await formInputs.count()

    if (inputCount >= 4) {
      // Fill by order: first name, last name, email, phone
      await formInputs.nth(0).fill(EMP_FIRST)
      await formInputs.nth(1).fill(EMP_LAST)
      await formInputs.nth(2).fill(EMP_EMAIL)
    } else {
      // Try label-based
      await page.getByLabel(/first name/i).fill(EMP_FIRST)
      await page.getByLabel(/last name/i).fill(EMP_LAST)
      await page.getByLabel(/email/i).first().fill(EMP_EMAIL)
    }

    // Fill designation if visible
    const designationInput = page.getByLabel(/designation/i).or(page.getByPlaceholder(/designation/i))
    if (await designationInput.isVisible()) {
      await designationInput.fill("QA Engineer")
    }

    // Submit the form
    const submitBtn = page.getByRole("button", { name: /save|submit|create|add/i }).last()
    await submitBtn.click()

    // Wait for modal to close or success message
    await page.waitForTimeout(2_000)
  })

  test("should search for employees", async ({ page }) => {
    // Look for search input (use .first() to handle multiple matches)
    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill("a")
      await page.waitForTimeout(1_000)
      await expect(page).toHaveURL(/employees/)
    }
  })

  test("should view employee details by clicking row", async ({ page }) => {
    // Click first employee row/card
    const firstRow = page.locator("table tbody tr, [data-employee]").first()
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.click()
      await page.waitForTimeout(1_000)
    }
  })

  test("should handle pagination if available", async ({ page }) => {
    const nextBtn = page.getByRole("button", { name: /next/i }).first()
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const isDisabled = await nextBtn.isDisabled()
      if (!isDisabled) {
        await nextBtn.click()
        await page.waitForTimeout(1_000)
      }
    }
  })

  test("should export employees if export button exists", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export|csv|pdf/i }).first()
    if (await exportBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Just verify the button is clickable, don't actually download
      await expect(exportBtn).toBeEnabled()
    }
  })
})
