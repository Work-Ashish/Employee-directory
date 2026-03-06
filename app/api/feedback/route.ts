import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action, hasPermission } from "@/lib/permissions"
import { feedbackSchema } from "@/lib/schemas"

// GET /api/feedback – List feedback
export const GET = withAuth({ module: Module.FEEDBACK, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get("period")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = orgFilter(ctx)

        if (period) where.period = period

        // CEO/HR see all feedback, others see own given/received only
        if (!hasPermission(ctx.role, Module.EMPLOYEES, Action.VIEW)) {
            if (!ctx.employeeId) {
                return apiSuccess([])
            }
            where.OR = [
                { fromEmployeeId: ctx.employeeId },
                { toEmployeeId: ctx.employeeId },
            ]
        } else if (employeeId) {
            where.toEmployeeId = employeeId
        }

        const feedback = await prisma.employeeFeedback.findMany({
            where,
            include: {
                fromEmployee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                toEmployee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        // Redact sender info for anonymous feedback
        const result = feedback.map(f => ({
            ...f,
            fromEmployee: f.isAnonymous ? null : f.fromEmployee,
            fromEmployeeId: f.isAnonymous ? null : f.fromEmployeeId,
        }))

        return apiSuccess(result)
    } catch (error) {
        return apiError("Failed to fetch feedback", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/feedback – Submit feedback
export const POST = withAuth({ module: Module.FEEDBACK, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = feedbackSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const { toEmployeeId, content, rating, isAnonymous, period } = parsed.data

        if (!ctx.employeeId) {
            return apiError("No employee record linked to your account", ApiErrorCode.FORBIDDEN, 403)
        }

        // Can't give feedback to yourself
        if (toEmployeeId === ctx.employeeId) {
            return apiError("Cannot submit feedback for yourself", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        // Verify target exists in org
        const target = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id: toEmployeeId }),
        })
        if (!target) return apiError("Target employee not found", ApiErrorCode.NOT_FOUND, 404)

        const feedback = await prisma.employeeFeedback.create({
            data: {
                fromEmployeeId: isAnonymous ? null : ctx.employeeId,
                toEmployeeId,
                content,
                rating,
                isAnonymous,
                period,
                organizationId: ctx.organizationId,
            },
        })

        return apiSuccess(feedback, undefined, 201)
    } catch (error: any) {
        if (error?.code === "P2002") {
            return apiError("You have already submitted feedback for this employee in this period", ApiErrorCode.CONFLICT, 409)
        }
        return apiError("Failed to submit feedback", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
