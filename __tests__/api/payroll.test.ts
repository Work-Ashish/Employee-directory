import { beforeEach, describe, expect, test, vi } from "vitest"

/**
 * Payroll API routes are now Django proxies (Sprint 13).
 * Business logic tests live in Django (apps.payroll.tests).
 * These tests verify the proxy wiring is correct.
 */

const mockProxyToDjango = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200 })
)
vi.mock("@/lib/django-proxy", () => ({
    proxyToDjango: (...args: unknown[]) => mockProxyToDjango(...args),
}))
vi.mock("@/lib/route-deprecation", () => ({
    deprecatedRoute: vi.fn(),
}))

import { GET as getPayroll, POST as createPayroll } from "@/app/api/payroll/route"
import { POST as runPayroll } from "@/app/api/payroll/run/route"
import { GET as getPayrollConfig, POST as upsertPayrollConfig } from "@/app/api/payroll/config/route"

describe("Payroll API Routes (Django Proxy)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    test("GET /api/payroll proxies to Django /payroll/", async () => {
        const req = new Request("http://localhost:3000/api/payroll")
        await getPayroll(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/payroll/")
    })

    test("POST /api/payroll proxies to Django /payroll/", async () => {
        const req = new Request("http://localhost:3000/api/payroll", {
            method: "POST",
            body: JSON.stringify({ month: "2026-03", employeeId: "emp-1" }),
        })
        await createPayroll(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/payroll/")
    })

    test("POST /api/payroll/run proxies to Django /payroll/run/", async () => {
        const req = new Request("http://localhost:3000/api/payroll/run", {
            method: "POST",
            body: JSON.stringify({}),
        })
        await runPayroll(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/payroll/run/")
    })

    test("GET /api/payroll/config proxies to Django /payroll/config/", async () => {
        const req = new Request("http://localhost:3000/api/payroll/config")
        await getPayrollConfig(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/payroll/config/")
    })

    test("POST /api/payroll/config proxies to Django /payroll/config/", async () => {
        const req = new Request("http://localhost:3000/api/payroll/config", {
            method: "POST",
            body: JSON.stringify({ regimeName: "New Regime" }),
        })
        await upsertPayrollConfig(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/payroll/config/")
    })

    test("returns Django response status and body", async () => {
        const body = { data: { id: "pay-1", netSalary: 60000 } }
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify(body), { status: 201 })
        )

        const req = new Request("http://localhost:3000/api/payroll", { method: "POST", body: "{}" })
        const res = await createPayroll(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.id).toBe("pay-1")
    })
})
