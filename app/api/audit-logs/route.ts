import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"

// GET /api/audit-logs – List audit logs (CEO/HR only via SETTINGS.VIEW permission)
export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 100)
        const entityType = searchParams.get("entityType")
        const userId = searchParams.get("userId")
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = orgFilter(ctx)
        if (entityType) where.entityType = entityType
        if (userId) where.userId = userId

        const [logs, total] = await prisma.$transaction([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ])

        return apiSuccess({
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        return apiError("Failed to fetch audit logs", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
