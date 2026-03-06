import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"

// GET /api/attendance/:id
export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const record = await prisma.attendance.findUnique({
            where: { id, organizationId: ctx.organizationId },
            include: { employee: true },
        })

        if (!record) {
            return apiError("Record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess(record)
    } catch (error) {
        console.error("[ATTENDANCE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/attendance/:id – Update (check-out, edit record)
export const PUT = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()

        const existing = await prisma.attendance.findUnique({
            where: { id, organizationId: ctx.organizationId },
        })
        if (!existing) {
            return apiError("Record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const data: Record<string, unknown> = {}
        if (body.checkIn !== undefined) data.checkIn = body.checkIn ? new Date(body.checkIn) : null
        if (body.checkOut !== undefined) data.checkOut = body.checkOut ? new Date(body.checkOut) : null
        if (body.workHours !== undefined) data.workHours = body.workHours !== null ? parseFloat(body.workHours) : null
        if (body.status !== undefined) data.status = body.status

        const record = await prisma.attendance.update({
            where: { id },
            data,
            include: { employee: true },
        })

        return apiSuccess(record)
    } catch (error) {
        console.error("[ATTENDANCE_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/attendance/:id
export const DELETE = withAuth({ module: Module.ATTENDANCE, action: Action.DELETE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const existing = await prisma.attendance.findUnique({
            where: { id, organizationId: ctx.organizationId },
        })
        if (!existing) {
            return apiError("Record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        await prisma.attendance.delete({ where: { id } })

        return apiSuccess({ message: "Record deleted" })
    } catch (error) {
        console.error("[ATTENDANCE_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
