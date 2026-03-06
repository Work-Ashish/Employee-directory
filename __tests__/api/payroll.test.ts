import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET as getPayroll, POST as createPayroll } from "@/app/api/payroll/route"
import { POST as runPayroll } from "@/app/api/payroll/run/route"
import { GET as getPayrollConfig, POST as upsertPayrollConfig } from "@/app/api/payroll/config/route"
import { auth } from "@/lib/auth"
import { Roles } from "@/lib/permissions"
import { prismaMock } from "../setup"

describe("Payroll API Routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET /api/payroll returns 400 for employee without profile", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })
        prismaMock.employee.findFirst.mockResolvedValueOnce(null)

        const req = new Request("http://localhost:3000/api/payroll")
        const res = await getPayroll(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error.code).toBe("BAD_REQUEST")
    })

    test("POST /api/payroll rejects malformed payload", async () => {
        const req = new Request("http://localhost:3000/api/payroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month: "2026-01", employeeId: "bad" })
        })

        const res = await createPayroll(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    test("POST /api/payroll creates payroll for valid admin input", async () => {
        prismaMock.payroll.create.mockResolvedValueOnce({
            id: "pay-1",
            employeeId: "emp-1",
            organizationId: "org-1",
            month: "2026-03",
            netSalary: 60000
        })

        const req = new Request("http://localhost:3000/api/payroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                month: "2026-03",
                basicSalary: 50000,
                allowances: 10000,
                arrears: 0,
                reimbursements: 0,
                loansAdvances: 0,
                pfDeduction: 0,
                tax: 0,
                otherDed: 0,
                netSalary: 60000,
                employeeId: "emp-1"
            })
        })

        const res = await createPayroll(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.id).toBe("pay-1")
        expect(prismaMock.payroll.create).toHaveBeenCalledTimes(1)
    })

    test("POST /api/payroll/run returns 401 when unauthorized", async () => {
        ; (auth as any).mockResolvedValueOnce(null)

        const req = new Request("http://localhost:3000/api/payroll/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        })

        const res = await runPayroll(req as any)
        expect(res.status).toBe(401)
    })

    test("POST /api/payroll/run returns 400 for invalid payload", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "admin-1", role: Roles.CEO, organizationId: "org-1" }
        })

        const req = new Request("http://localhost:3000/api/payroll/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId: "invalid-cuid", month: "bad" })
        })

        const res = await runPayroll(req as any)
        expect(res.status).toBe(400)
    })

    test("POST /api/payroll/run returns 400 when compliance config missing", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "admin-1", role: Roles.CEO, organizationId: "org-1" }
        })
        prismaMock.payrollComplianceConfig.findFirst.mockResolvedValueOnce(null)

        const req = new Request("http://localhost:3000/api/payroll/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employeeId: "ckd7v1x2y0000qzrmn831i7rn",
                month: "2026-03",
                basicSalary: 50000,
                allowances: 5000,
                arrears: 0,
                reimbursements: 0,
                loansAdvances: 0,
                otherDed: 0
            })
        })

        const res = await runPayroll(req as any)
        expect(res.status).toBe(400)
    })

    test("GET /api/payroll/config allows EMPLOYEE with PAYROLL VIEW permission", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })
        prismaMock.payrollComplianceConfig.findFirst.mockResolvedValueOnce(null)

        const req = new Request("http://localhost:3000/api/payroll/config")
        const res = await getPayrollConfig(req as any)

        expect(res.status).toBe(200)
    })

    test("GET /api/payroll/config returns active configuration for admin", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "admin-1", role: Roles.CEO, organizationId: "org-1" }
        })
        prismaMock.payrollComplianceConfig.findFirst.mockResolvedValueOnce({
            id: "pc-1",
            regimeName: "New Regime",
            pfPercentage: 12,
            standardDeduction: 50000,
            healthCess: 4,
            isActive: true,
            taxSlabs: [{ minIncome: 0, maxIncome: 300000, taxRate: 0, baseTax: 0 }]
        })

        const req = new Request("http://localhost:3000/api/payroll/config")
        const res = await getPayrollConfig(req as any)

        expect(res.status).toBe(200)
        expect(prismaMock.payrollComplianceConfig.findFirst).toHaveBeenCalledTimes(1)
    })

    test("POST /api/payroll/config creates new active config with tax slabs", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "admin-1", role: Roles.CEO, organizationId: "org-1" }
        })
        prismaMock.payrollComplianceConfig.updateMany.mockResolvedValueOnce({ count: 1 })
        prismaMock.payrollComplianceConfig.create.mockResolvedValueOnce({
            id: "pc-2",
            regimeName: "New Regime",
            taxSlabs: [{ id: "ts-1", minIncome: 0, maxIncome: 300000, taxRate: 0, baseTax: 0 }]
        })

        const req = new Request("http://localhost:3000/api/payroll/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                regimeName: "New Regime",
                pfPercentage: 12,
                standardDeduction: 50000,
                healthCess: 4,
                isActive: true,
                taxSlabs: [
                    { minIncome: 0, maxIncome: 300000, taxRate: 0, baseTax: 0 },
                    { minIncome: 300000, maxIncome: 700000, taxRate: 0.05, baseTax: 0 }
                ]
            })
        })

        const res = await upsertPayrollConfig(req as any)
        expect(res.status).toBe(201)
        expect(prismaMock.payrollComplianceConfig.updateMany).toHaveBeenCalledTimes(1)
        expect(prismaMock.payrollComplianceConfig.create).toHaveBeenCalledTimes(1)
    })
})
