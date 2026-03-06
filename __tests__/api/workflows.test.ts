import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET as getTemplates, POST as createTemplate } from "@/app/api/workflows/templates/route"
import { auth } from "@/lib/auth"
import { Roles } from "@/lib/permissions"
import { prismaMock } from "../setup"

describe("Workflows API Routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET /api/workflows/templates returns 403 without organization context", async () => {
        ; (auth as any).mockResolvedValueOnce({ user: { id: "u1", role: Roles.CEO } })

        const req = new Request("http://localhost:3000/api/workflows/templates")
        const res = await getTemplates(req as any)

        expect(res.status).toBe(403)
    })

    test("POST /api/workflows/templates returns 403 for non-admin", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })

        const req = new Request("http://localhost:3000/api/workflows/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        })

        const res = await createTemplate(req as any)
        expect(res.status).toBe(403)
    })

    test("POST /api/workflows/templates validates payload", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "admin-1", role: Roles.CEO, organizationId: "org-1" }
        })

        const req = new Request("http://localhost:3000/api/workflows/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Ticket Flow",
                entityType: "TICKET",
                steps: []
            })
        })

        const res = await createTemplate(req as any)
        expect(res.status).toBe(400)
    })

    test("POST /api/workflows/templates creates template for valid input", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "admin-1", role: Roles.CEO, organizationId: "org-1" }
        })
        prismaMock.workflowTemplate.create.mockResolvedValueOnce({
            id: "wf-1",
            name: "Ticket Flow",
            steps: [{ id: "step-1", stepOrder: 1 }]
        })

        const req = new Request("http://localhost:3000/api/workflows/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Ticket Flow",
                description: "Approval chain for help-desk tickets",
                entityType: "TICKET",
                steps: [
                    {
                        stepOrder: 1,
                        approverType: "ROLE",
                        role: Roles.CEO,
                        slaHours: 24
                    }
                ]
            })
        })

        const res = await createTemplate(req as any)

        expect(res.status).toBe(201)
        expect(prismaMock.workflowTemplate.create).toHaveBeenCalledTimes(1)
    })
})
