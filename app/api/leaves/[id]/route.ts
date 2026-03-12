import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/leaves/:id
export const GET = withAuth({ module: Module.LEAVES, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        const leave = await prisma.leave.findFirst({
            where: { id, employee: { organizationId: ctx.organizationId } },
            include: { employee: true },
        })

        if (!leave) {
            return apiError("Leave not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Non-admin: can only view own leaves (UPDATE permission = can view all for approval)
        if (!hasPermission(ctx.role, Module.LEAVES, Action.UPDATE) && leave.employeeId !== ctx.employeeId) {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        return apiSuccess(leave)
    } catch (error) {
        console.error("[LEAVE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/leaves/:id – Approve/Reject or update a leave
export const PUT = withAuth({ module: Module.LEAVES, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()

        const existing = await prisma.leave.findFirst({ where: { id, employee: { organizationId: ctx.organizationId } } })
        if (!existing) {
            return apiError("Leave not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const leave = await prisma.leave.update({
            where: { id },
            data: { status: body.status },
            include: { employee: true },
        })

        return apiSuccess(leave)
    } catch (error) {
        console.error("[LEAVE_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/leaves/:id
export const DELETE = withAuth({ module: Module.LEAVES, action: Action.DELETE }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        const existing = await prisma.leave.findFirst({ where: { id, employee: { organizationId: ctx.organizationId } } })
        if (!existing) {
            return apiError("Leave not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Non-admin: can only delete own leaves
        if (!hasPermission(ctx.role, Module.LEAVES, Action.UPDATE) && existing.employeeId !== ctx.employeeId) {
            return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
        }

        // Non-admin: can only cancel pending requests
        if (existing.status !== "PENDING" && !hasPermission(ctx.role, Module.LEAVES, Action.UPDATE)) {
            return apiError("Can only cancel pending requests", ApiErrorCode.BAD_REQUEST, 400)
        }

        await prisma.leave.delete({ where: { id } })

        return apiSuccess({ message: "Leave request deleted" })
    } catch (error) {
        console.error("[LEAVE_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
