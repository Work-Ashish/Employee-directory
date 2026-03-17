import { beforeEach, describe, expect, test, vi } from "vitest"

/**
 * Reports API routes are now Django proxies (Sprint 14).
 * Business logic tests live in Django (apps.reports.tests).
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

import { POST as queryReport } from "@/app/api/reports/query/route"
import { GET as getExport, POST as createExport } from "@/app/api/reports/export/route"
import { GET as getSaved, POST as createSaved } from "@/app/api/reports/saved/route"

describe("Reports API Routes (Django Proxy)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    test("POST /api/reports/query proxies to Django /reports/query/", async () => {
        const req = new Request("http://localhost:3000/api/reports/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entityType: "EMPLOYEE", columns: ["firstName"] }),
        })
        await queryReport(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/reports/query/")
    })

    test("GET /api/reports/export proxies to Django /reports/export/", async () => {
        const req = new Request("http://localhost:3000/api/reports/export")
        await getExport(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/reports/export/")
    })

    test("POST /api/reports/export proxies to Django /reports/export/", async () => {
        const req = new Request("http://localhost:3000/api/reports/export", {
            method: "POST",
            body: JSON.stringify({ format: "csv", entityType: "EMPLOYEE" }),
        })
        await createExport(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/reports/export/")
    })

    test("GET /api/reports/saved proxies to Django /reports/saved/", async () => {
        const req = new Request("http://localhost:3000/api/reports/saved")
        await getSaved(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/reports/saved/")
    })

    test("POST /api/reports/saved proxies to Django /reports/saved/", async () => {
        const req = new Request("http://localhost:3000/api/reports/saved", {
            method: "POST",
            body: JSON.stringify({ name: "Monthly Report", query: {} }),
        })
        await createSaved(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/reports/saved/")
    })

    test("relays Django response status and body", async () => {
        const body = { data: [{ firstName: "Alice", employeeCode: "EMP001" }], meta: { total: 1 } }
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify(body), { status: 200 })
        )

        const req = new Request("http://localhost:3000/api/reports/query", {
            method: "POST",
            body: JSON.stringify({ entityType: "EMPLOYEE" }),
        })
        const res = await queryReport(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data[0].firstName).toBe("Alice")
    })
})
