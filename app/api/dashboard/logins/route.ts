import { withAuth } from "@/lib/security"
import { Module, Action, Roles } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export const dynamic = "force-dynamic"

// GET /api/dashboard/logins
// Returns employees who have logged in today + recent login history
export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (req, ctx) => {
    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        // Users who logged in today within the same organization
        const activeTodayUsers = await prisma.user.findMany({
            where: {
                lastLoginAt: { gte: startOfDay },
                role: Roles.EMPLOYEE,
                organizationId: ctx.organizationId
            },
            select: {
                id: true,
                name: true,
                lastLoginAt: true,
                avatar: true,
                employee: {
                    select: {
                        employeeCode: true,
                        designation: true,
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: { lastLoginAt: "desc" },
            take: 10,
        })

        // Recent logins (last 7 days) for history table
        const since7Days = new Date()
        since7Days.setDate(since7Days.getDate() - 7)

        const recentLogins = await prisma.user.findMany({
            where: {
                lastLoginAt: { gte: since7Days },
                role: Roles.EMPLOYEE,
                organizationId: ctx.organizationId
            },
            select: {
                name: true,
                lastLoginAt: true,
                avatar: true,
                employee: {
                    select: {
                        employeeCode: true,
                        designation: true,
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: { lastLoginAt: "desc" },
            take: 20,
        })

        return apiSuccess({
            activeTodayCount: activeTodayUsers.length,
            activeTodayUsers,
            recentLogins,
        })
    } catch (error) {
        console.error("[DASHBOARD_LOGINS]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
