import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })
        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get all employees with their active sessions
        const employees = await prisma.employee.findMany({
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

        return NextResponse.json({
            employees: dashboard,
            summary: { online, idle, onBreak, offline, total: dashboard.length }
        })
    } catch (error: any) {
        console.error("[ADMIN_TIME_TRACKER]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
