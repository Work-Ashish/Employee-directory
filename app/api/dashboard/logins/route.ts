import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/dashboard/logins
// Returns employees who have logged in today + recent login history
export async function GET() {
    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        // Users who logged in today
        const activeTodayUsers = await prisma.user.findMany({
            where: {
                lastLoginAt: { gte: startOfDay },
                role: "EMPLOYEE",
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
                role: "EMPLOYEE",
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

        return NextResponse.json({
            activeTodayCount: activeTodayUsers.length,
            activeTodayUsers,
            recentLogins,
        })
    } catch (error) {
        console.error("[DASHBOARD_LOGINS]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
