import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { resignationSchema } from "@/lib/schemas"
import { WorkflowEngine } from "@/lib/workflow-engine"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/resignations – List resignations (scoped)
export const GET = withAuth({ module: Module.RESIGNATION, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, any> = { organizationId: ctx.organizationId }
        if (status) where.status = status

        if (!hasPermission(ctx.role, Module.RESIGNATION, Action.UPDATE)) {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true }
            })
            if (employee) where.employeeId = employee.id
            else return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const resignations = await prisma.resignation.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
            orderBy: { createdAt: "desc" },
            take: 200,
        })

        return apiSuccess(resignations)
    } catch (error) {
        console.error("[RESIGNATIONS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/resignations – Submit resignation
export const POST = withAuth({ module: Module.RESIGNATION, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = resignationSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        let employeeId = parsed.data.employeeId
        if (!hasPermission(ctx.role, Module.RESIGNATION, Action.UPDATE) || !employeeId) {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true }
            })
            if (!employee) return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
            employeeId = employee.id
        }

        const resignation = await prisma.resignation.create({
            data: {
                reason: parsed.data.reason,
                lastDay: parsed.data.lastDay,
                status: "UNDER_REVIEW",
                employeeId: employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: true },
        })

        const template = await prisma.workflowTemplate.findFirst({
            where: { organizationId: ctx.organizationId, entityType: 'RESIGNATION', status: 'PUBLISHED' }
        })
        if (template) {
            await WorkflowEngine.initiateWorkflow(template.id, resignation.id, employeeId, ctx.organizationId)
        }

        return apiSuccess(resignation, undefined, 201)
    } catch (error) {
        console.error("[RESIGNATIONS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/resignations – Update resignation status
export const PUT = withAuth({ module: Module.RESIGNATION, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        if (!body.id) return apiError("ID required", ApiErrorCode.BAD_REQUEST, 400)

        const result = await prisma.resignation.updateMany({
            where: { id: body.id, organizationId: ctx.organizationId },
            data: { status: body.status },
        })

        if (result.count === 0) {
            return apiError("Resignation not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const updated = await prisma.resignation.findUnique({
            where: { id: body.id },
            include: { employee: true },
        })

        return apiSuccess(updated)
    } catch (error) {
        console.error("[RESIGNATIONS_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
