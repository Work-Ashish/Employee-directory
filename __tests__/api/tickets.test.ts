import { beforeEach, describe, expect, test, vi } from "vitest"
import { auth } from "@/lib/auth"
import { Roles } from "@/lib/permissions"
import { prismaMock } from "../setup"

vi.mock("@/lib/workflow-engine", () => ({
    WorkflowEngine: {
        initiateWorkflow: vi.fn().mockResolvedValue({ id: "inst-1" })
    }
}))

import { WorkflowEngine } from "@/lib/workflow-engine"
import { GET as getTickets, POST as createTicket, PUT as updateTicket } from "@/app/api/tickets/route"

describe("Tickets API Routes", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET /api/tickets returns 400 for employee without profile", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })
        prismaMock.employee.findFirst.mockResolvedValueOnce(null)

        const req = new Request("http://localhost:3000/api/tickets")
        const res = await getTickets(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error.code).toBe("BAD_REQUEST")
    })

    test("POST /api/tickets rejects malformed payload", async () => {
        // EMPLOYEE has TICKETS.CREATE (CEO does not)
        ;(auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })

        const req = new Request("http://localhost:3000/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject: "bad", category: "IT" })
        })

        const res = await createTicket(req)
        expect(res.status).toBe(400)
    })

    test("POST /api/tickets creates ticket and triggers workflow", async () => {
        // EMPLOYEE has TICKETS.CREATE (CEO does not)
        ;(auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })
        // First call consumed by withAuth (employeeId resolution), second by route handler (ownership)
        prismaMock.employee.findFirst.mockResolvedValueOnce({ id: "emp-1" })
        prismaMock.employee.findFirst.mockResolvedValueOnce({ id: "emp-1" })

        prismaMock.ticket.create.mockResolvedValueOnce({
            id: "t-1",
            ticketCode: "TKT-2026-ABCDEF12",
            employeeId: "emp-1",
            organizationId: "org-1"
        })
        prismaMock.workflowTemplate.findFirst.mockResolvedValueOnce({
            id: "wf-1"
        })

        const req = new Request("http://localhost:3000/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject: "Printer not working",
                description: "Printer fails with paper jam error",
                category: "IT",
                priority: "HIGH",
                employeeId: "emp-1"
            })
        })

        const res = await createTicket(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.id).toBe("t-1")
        expect(WorkflowEngine.initiateWorkflow).toHaveBeenCalledTimes(1)
    })

    test("PUT /api/tickets returns 403 when employee profile missing", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })
        prismaMock.employee.findFirst.mockResolvedValueOnce(null)

        const req = new Request("http://localhost:3000/api/tickets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: "t-1",
                status: "CLOSED"
            })
        })

        const res = await updateTicket(req)
        expect(res.status).toBe(403)
    })

    test("PUT /api/tickets returns 404 when no row updated", async () => {
        ; (auth as any).mockResolvedValueOnce({
            user: { id: "u-emp-1", role: Roles.EMPLOYEE, organizationId: "org-1" }
        })
        // First call consumed by withAuth (employeeId resolution), second by route handler (ownership check)
        prismaMock.employee.findFirst.mockResolvedValueOnce({ id: "emp-1" })
        prismaMock.employee.findFirst.mockResolvedValueOnce({ id: "emp-1" })
        prismaMock.ticket.updateMany.mockResolvedValueOnce({ count: 0 })

        const req = new Request("http://localhost:3000/api/tickets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: "t-1",
                status: "CLOSED"
            })
        })

        const res = await updateTicket(req)
        const json = await res.json()

        expect(res.status).toBe(404)
        expect(json.error.code).toBe("NOT_FOUND")
    })
})
