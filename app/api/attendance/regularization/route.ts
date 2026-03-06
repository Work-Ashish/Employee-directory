import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { regularizationSchema } from "@/lib/schemas/attendance"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/attendance/regularization – List regularization requests
export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        const where: any = { organizationId: ctx.organizationId }

        // If user doesn't have UPDATE permission, they can only see their own requests
        if (!hasPermission(ctx.role, Module.ATTENDANCE, Action.UPDATE)) {
            where.employeeId = ctx.employeeId
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const requests = await prisma.attendanceRegularization.findMany({
            where,
            include: { attendance: true, employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { createdAt: "desc" }
        })

        return apiSuccess(requests)
    } catch (error) {
        console.error("[REGULARIZATION_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/attendance/regularization – Submit a regularization request
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validatedData = regularizationSchema.parse(body)

        // Verify attendance record exists and belongs to the organization
        const attendance = await prisma.attendance.findFirst({
            where: { id: validatedData.attendanceId, organizationId: ctx.organizationId }
        })

        if (!attendance) {
            return apiError("Attendance record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Only the employee who owns the record (or a user with UPDATE permission) can request regularization
        if (!hasPermission(ctx.role, Module.ATTENDANCE, Action.UPDATE) && attendance.employeeId !== ctx.employeeId) {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        const request = await prisma.attendanceRegularization.create({
            data: {
                ...validatedData,
                employeeId: attendance.employeeId,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(request, { message: "Regularization request submitted" }, 201)
    } catch (error: any) {
        console.error("[REGULARIZATION_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
