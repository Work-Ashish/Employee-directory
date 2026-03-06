import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { z } from "zod"

// GET /api/notifications
// Fetch recent notifications for the current user
export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (req, ctx) => {
    try {
        const notifications = await prisma.inAppNotification.findMany({
            where: {
                userId: ctx.userId,
                organizationId: ctx.organizationId
            },
            orderBy: { createdAt: "desc" },
            take: 20
        })

        return apiSuccess(notifications)
    } catch (error) {
        console.error("[NOTIFICATIONS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PATCH /api/notifications
// Mark specific or all notifications as read
export const PATCH = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { id, markAll } = body

        if (markAll) {
            await prisma.inAppNotification.updateMany({
                where: {
                    userId: ctx.userId,
                    organizationId: ctx.organizationId,
                    isRead: false
                },
                data: { isRead: true }
            })
            return apiSuccess({ message: "All marked as read" })
        }

        if (!id) return apiError("Missing ID", ApiErrorCode.VALIDATION_ERROR, 400)

        await prisma.inAppNotification.update({
            where: { id, userId: ctx.userId },
            data: { isRead: true }
        })

        return apiSuccess({ success: true })
    } catch (error) {
        console.error("[NOTIFICATIONS_PATCH]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
