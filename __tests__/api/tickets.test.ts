import { beforeEach, describe, expect, test, vi } from "vitest"

/**
 * Tickets API routes are now Django proxies (Sprint 13).
 * Business logic tests live in Django (apps.tickets.tests).
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

import { GET, POST, PUT } from "@/app/api/tickets/route"

describe("Tickets API Routes (Django Proxy)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    test("GET proxies to Django /tickets/", async () => {
        const req = new Request("http://localhost:3000/api/tickets")
        await GET(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/tickets/")
    })

    test("POST proxies to Django /tickets/", async () => {
        const req = new Request("http://localhost:3000/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject: "Printer broken", category: "IT" }),
        })
        await POST(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/tickets/")
    })

    test("PUT proxies to Django /tickets/", async () => {
        const req = new Request("http://localhost:3000/api/tickets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "t-1", status: "CLOSED" }),
        })
        await PUT(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/tickets/")
    })

    test("relays Django 201 response for created tickets", async () => {
        const body = { data: { id: "t-1", ticketCode: "TKT-2026-ABC" } }
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify(body), { status: 201 })
        )

        const req = new Request("http://localhost:3000/api/tickets", {
            method: "POST",
            body: JSON.stringify({ subject: "Test" }),
        })
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.ticketCode).toBe("TKT-2026-ABC")
    })
})
