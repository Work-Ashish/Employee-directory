import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        // Fetch unresolved Admin Alerts scoped to org
        const alerts = await prisma.adminAlerts.findMany({
            where: { resolved: false, organizationId: ctx.organizationId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                        designation: true,
                        department: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        // Fetch latest Weekly Scores scoped to org
        const scores = await prisma.weeklyScores.findMany({
            where: { organizationId: ctx.organizationId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                        designation: true,
                        department: { select: { name: true } }
                    }
                }
            },
            take: 100,
            orderBy: { weekStartDate: "desc" }
        })

        // Format for frontend
        const formattedAlerts = alerts.map((a: any) => ({
            id: a.id,
            employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
            avatarUrl: a.employee.avatarUrl,
            designation: a.employee.designation,
            department: a.employee.department?.name || 'Unassigned',
            severity: a.severity,
            reason: a.reason,
            createdAt: a.createdAt.toISOString()
        }))

        const formattedScores = scores.map((s: any) => ({
            id: s.id,
            employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
            avatarUrl: s.employee.avatarUrl,
            designation: s.employee.designation,
            baseScore: Number(s.baseScore),
            aiAdjustment: Number(s.aiAdjustment),
            finalScore: Number(s.finalScore),
            burnoutRisk: s.burnoutRisk,
            behavioralAnomaly: s.behavioralAnomaly,
            weekStartDate: s.weekStartDate.toISOString()
        }))

        return apiSuccess({ alerts: formattedAlerts, scores: formattedScores })

    } catch (error) {
        console.error("[ADMIN_PERFORMANCE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
