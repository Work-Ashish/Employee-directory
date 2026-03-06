import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/admin/sessions - List active sessions for the organization
export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const sessions = await prisma.userSession.findMany({
            where: { organizationId: ctx.organizationId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        avatar: true
                    }
                }
            },
            orderBy: { lastActive: "desc" },
            take: 100
        })

        const mapped = sessions.map(s => ({
            id: s.id,
            userName: s.user.name,
            email: s.user.email,
            avatar: s.user.avatar,
            ipAddress: s.ipAddress || "Unknown",
            userAgent: s.userAgent || "Unknown",
            lastActive: s.lastActive,
            isRevoked: s.isRevoked,
            isActive: !s.isRevoked && s.expires > new Date()
        }))

        return apiSuccess(mapped)
    } catch (error) {
        console.error("[ADMIN_SESSIONS_GET]", error)
        return apiError("Failed to fetch sessions", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
