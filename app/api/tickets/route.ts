import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import crypto from "crypto"
import { ticketSchema, updateTicketSchema } from "@/lib/schemas"
import { WorkflowEngine } from "@/lib/workflow-engine"

// GET /api/tickets – List help desk tickets (scoped)
export const GET = withAuth(["ADMIN", "EMPLOYEE"], async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, any> = { organizationId: ctx.organizationId }
        if (status) where.status = status

        // Non-admins can only see their own tickets
        if (ctx.role !== "ADMIN") {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true }
            })
            if (employee) where.employeeId = employee.id
            else return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const tickets = await prisma.ticket.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
        })

        return apiSuccess(tickets)
    } catch (error) {
        console.error("[TICKETS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/tickets – Create a ticket
export const POST = withAuth(["ADMIN", "EMPLOYEE"], async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = ticketSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        let employeeId = parsed.data.employeeId
        if (ctx.role !== "ADMIN" || !employeeId) {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true }
            })
            if (!employee) return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
            employeeId = employee.id
        }

        // Generate collision-resistant ticket code
        const shortId = crypto.randomUUID().slice(0, 8).toUpperCase()
        const ticketCode = `TKT-${new Date().getFullYear()}-${shortId}`

        const ticket = await prisma.ticket.create({
            data: {
                ticketCode,
                subject: parsed.data.subject,
                description: parsed.data.description,
                category: parsed.data.category,
                priority: parsed.data.priority || "MEDIUM",
                status: "OPEN",
                employeeId: employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: true },
        })

        const template = await prisma.workflowTemplate.findFirst({
            where: { organizationId: ctx.organizationId, entityType: 'TICKET', status: 'PUBLISHED' }
        })
        if (template) {
            await WorkflowEngine.initiateWorkflow(template.id, ticket.id, employeeId, ctx.organizationId)
        }

        return apiSuccess(ticket, undefined, 201)
    } catch (error) {
        console.error("[TICKETS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/tickets – Update ticket status
export const PUT = withAuth(["ADMIN", "EMPLOYEE"], async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = updateTicketSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        // Verify ownership/permission
        const where: any = { id: parsed.data.id, organizationId: ctx.organizationId }

        // Non-admin can only update their own tickets (e.g. closing them)
        if (ctx.role !== "ADMIN") {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId }
            })
            if (!employee) return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
            where.employeeId = employee.id
        }

        const result = await prisma.ticket.updateMany({
            where,
            data: {
                status: parsed.data.status,
                priority: parsed.data.priority,
            }
        })

        if (result.count === 0) {
            return apiError("Ticket not found or unauthorized", ApiErrorCode.NOT_FOUND, 404)
        }

        const updated = await prisma.ticket.findUnique({
            where: { id: parsed.data.id },
            include: { employee: true },
        })

        return apiSuccess(updated)
    } catch (error) {
        console.error("[TICKETS_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
