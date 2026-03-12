import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get employees with their active sessions (paginated)
        const employees = await prisma.employee.findMany({
            where: orgFilter(ctx, { deletedAt: null }),
            take: 100, // K3: Bounded — prevents OOM with 50K employees
            select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                employeeCode: true,
                avatarUrl: true,
                department: { select: { name: true } },
                timeSessions: {
                    where: {
                        checkIn: { gte: today }
                    },
                    orderBy: { checkIn: "desc" },
                    take: 1,
                    include: {
                        snapshots: {
                            orderBy: { timestamp: "desc" },
                            take: 1,
                            select: { status: true, timestamp: true }
                        },
                        activities: {
                            orderBy: { startedAt: "desc" },
                            take: 1,
                            select: { appName: true, domain: true, category: true }
                        }
                    }
                }
            }
        })

        const dashboard = employees.map(emp => {
            const latestSession = emp.timeSessions[0]
            let currentStatus: "online" | "idle" | "break" | "offline" = "offline"
            let currentApp: string | null = null
            let checkInTime: Date | null = null

            if (latestSession) {
                if (latestSession.status === "ACTIVE") {
                    const lastSnap = latestSession.snapshots[0]
                    currentStatus = lastSnap?.status === "IDLE" ? "idle" : "online"
                } else if (latestSession.status === "BREAK") {
                    currentStatus = "break"
                }
                // COMPLETED = offline (they checked out)

                if (latestSession.status !== "COMPLETED") {
                    checkInTime = latestSession.checkIn
                    currentApp = latestSession.activities[0]?.appName || null
                }
            }

            return {
                id: emp.id,
                name: `${emp.firstName} ${emp.lastName}`,
                designation: emp.designation,
                employeeCode: emp.employeeCode,
                department: emp.department.name,
                avatarUrl: emp.avatarUrl,
                currentStatus,
                currentApp,
                checkInTime,
                totalWorkToday: latestSession?.totalWork || 0,
            }
        })

        // Summary stats
        const online = dashboard.filter(d => d.currentStatus === "online").length
        const idle = dashboard.filter(d => d.currentStatus === "idle").length
        const onBreak = dashboard.filter(d => d.currentStatus === "break").length
        const offline = dashboard.filter(d => d.currentStatus === "offline").length

        return apiSuccess({
            employees: dashboard,
            summary: { online, idle, onBreak, offline, total: dashboard.length }
        })
    } catch (error: any) {
        console.error("[ADMIN_TIME_TRACKER]", error?.message)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
