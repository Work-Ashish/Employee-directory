import { beforeEach, describe, expect, test, vi } from "vitest"

/**
 * Workflow API routes are now Django proxies (Sprint 14).
 * Business logic tests live in Django (apps.workflows.tests).
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

import { GET as getTemplates, POST as createTemplate } from "@/app/api/workflows/templates/route"
import { POST as workflowAction } from "@/app/api/workflows/action/route"

describe("Workflows API Routes (Django Proxy)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    test("GET /api/workflows/templates proxies to Django /workflows/templates/", async () => {
        const req = new Request("http://localhost:3000/api/workflows/templates")
        await getTemplates(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/workflows/templates/")
    })

    test("POST /api/workflows/templates proxies to Django /workflows/templates/", async () => {
        const req = new Request("http://localhost:3000/api/workflows/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Ticket Flow",
                entityType: "TICKET",
                steps: [{ stepOrder: 1, approverType: "ROLE", role: "CEO", slaHours: 24 }],
            }),
        })
        await createTemplate(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/workflows/templates/")
    })

    test("POST /api/workflows/action proxies to Django /workflows/action/", async () => {
        const req = new Request("http://localhost:3000/api/workflows/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instanceId: "wf-1", action: "APPROVE" }),
        })
        await workflowAction(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, "/workflows/action/")
    })

    test("relays Django 201 for created template", async () => {
        const body = { data: { id: "wf-1", name: "Ticket Flow" } }
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify(body), { status: 201 })
        )

        const req = new Request("http://localhost:3000/api/workflows/templates", {
            method: "POST",
            body: JSON.stringify({ name: "Ticket Flow" }),
        })
        const res = await createTemplate(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.id).toBe("wf-1")
    })
})
