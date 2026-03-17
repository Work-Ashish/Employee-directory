import { beforeEach, describe, expect, test, vi } from "vitest"

/**
 * Enterprise Identity API routes are now Django proxies (Sprint 14).
 * Business logic tests live in Django (apps.scim.tests, apps.sessions.tests).
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

import { GET as listSessions } from "@/app/api/admin/sessions/route"
import { POST as createScimUser } from "@/app/api/scim/v2/Users/route"

describe("Enterprise Identity Routes (Django Proxy)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    describe("SCIM Provisioning", () => {
        test("POST /api/scim/v2/Users proxies to Django /scim/v2/Users/", async () => {
            const req = new Request("http://localhost:3000/api/scim/v2/Users", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer valid-token",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userName: "scim@test.com",
                    name: { givenName: "Scim", familyName: "User" },
                }),
            })
            await createScimUser(req)

            expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/scim/v2/Users/")
        })

        test("relays Django 201 for created SCIM user", async () => {
            const body = { data: { id: "new-user-1", userName: "scim@test.com" } }
            mockProxyToDjango.mockResolvedValue(
                new Response(JSON.stringify(body), { status: 201 })
            )

            const req = new Request("http://localhost:3000/api/scim/v2/Users", {
                method: "POST",
                body: JSON.stringify({ userName: "scim@test.com" }),
            })
            const res = await createScimUser(req)

            expect(res.status).toBe(201)
        })

        test("relays Django 409 for duplicate SCIM user", async () => {
            mockProxyToDjango.mockResolvedValue(
                new Response(JSON.stringify({ error: "Conflict" }), { status: 409 })
            )

            const req = new Request("http://localhost:3000/api/scim/v2/Users", {
                method: "POST",
                body: JSON.stringify({ userName: "exists@test.com" }),
            })
            const res = await createScimUser(req)

            expect(res.status).toBe(409)
        })
    })

    describe("Session Management", () => {
        test("GET /api/admin/sessions proxies to Django /sessions/", async () => {
            const req = new Request("http://localhost:3000/api/admin/sessions")
            await listSessions(req)

            expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/sessions/")
        })

        test("relays Django 403 for unauthorized session access", async () => {
            mockProxyToDjango.mockResolvedValue(
                new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
            )

            const req = new Request("http://localhost:3000/api/admin/sessions")
            const res = await listSessions(req)

            expect(res.status).toBe(403)
        })
    })
})
