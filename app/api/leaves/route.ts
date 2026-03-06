import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { leaveSchema, updateLeaveSchema } from "@/lib/schemas"
import { WorkflowEngine } from "@/lib/workflow-engine"
import { Module, Action, hasPermission } from "@/lib/permissions"

// Safe employee select — no salary, bank, Aadhaar, PAN etc.
const SAFE_EMPLOYEE_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    employeeCode: true,
    designation: true,
    department: { select: { name: true } },
} as const

// GET /api/leaves – List leave requests (scoped)
export const GET = withAuth({ module: Module.LEAVES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 100)
        const skip = (page - 1) * limit

        const where: Record<string, any> = { organizationId: ctx.organizationId }
        if (status) where.status = status
        if (employeeId) where.employeeId = employeeId

        // Non-admin: only own leaves
        if (!hasPermission(ctx.role, Module.LEAVES, Action.UPDATE)) {
            const emp = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true },
            })
            if (!emp) return apiError("No employee profile linked", ApiErrorCode.BAD_REQUEST, 400)
            where.employeeId = emp.id
        }

        const [leaves, total] = await prisma.$transaction([
            prisma.leave.findMany({
                where,
                include: { employee: { select: SAFE_EMPLOYEE_SELECT } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.leave.count({ where }),
        ])

        return apiSuccess(leaves, { total, page, limit })
    } catch (error) {
        console.error("[LEAVES_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/leaves – Submit a leave request
export const POST = withAuth({ module: Module.LEAVES, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = leaveSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        let employeeId = parsed.data.employeeId
        if (!employeeId) {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
            })
            if (!employee) {
                return apiError("No employee profile linked to your account", ApiErrorCode.BAD_REQUEST, 400)
            }
            employeeId = employee.id
        } else if (!hasPermission(ctx.role, Module.LEAVES, Action.UPDATE)) {
            return apiError("Only admins can create leave for other employees", ApiErrorCode.FORBIDDEN, 403)
        }

        // K8: Duplicate check — prevent double-submit for overlapping dates
        const startDate = parsed.data.startDate
        const endDate = parsed.data.endDate

        const existing = await prisma.leave.findFirst({
            where: {
                employeeId,
                organizationId: ctx.organizationId,
                status: "PENDING",
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
        })
        if (existing) {
            return apiError("A pending leave request already exists for these dates", ApiErrorCode.CONFLICT, 409)
        }

        const leave = await prisma.leave.create({
            data: {
                type: parsed.data.type,
                startDate,
                endDate,
                reason: parsed.data.reason,
                status: "PENDING",
                employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: { select: SAFE_EMPLOYEE_SELECT } },
        })

        const template = await prisma.workflowTemplate.findFirst({
            where: { organizationId: ctx.organizationId, entityType: 'LEAVE', status: 'PUBLISHED' }
        })
        if (template) {
            await WorkflowEngine.initiateWorkflow(template.id, leave.id, employeeId, ctx.organizationId)
        }

        return apiSuccess(leave, undefined, 201)
    } catch (error) {
        console.error("[LEAVES_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/leaves – Approve/Reject a leave
export const PUT = withAuth({ module: Module.LEAVES, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = updateLeaveSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        // K13: Optimistic locking — only update if still PENDING
        const result = await prisma.leave.updateMany({
            where: { id: parsed.data.id, status: "PENDING", organizationId: ctx.organizationId },
            data: { status: parsed.data.status },
        })

        if (result.count === 0) {
            return apiError("Leave request has already been processed", ApiErrorCode.CONFLICT, 409)
        }

        const updated = await prisma.leave.findFirst({
            where: { id: parsed.data.id },
            include: { employee: { select: SAFE_EMPLOYEE_SELECT } },
        })

        return apiSuccess(updated)
    } catch (error) {
        console.error("[LEAVES_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
