import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function GET() {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Find active session
        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } },
            include: {
                breaks: { where: { endedAt: null }, take: 1 },
                snapshots: { orderBy: { timestamp: "desc" }, take: 1 },
            }
        })

        if (!session) {
            // Get today's completed sessions for summary
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todaySessions = await prisma.timeSession.findMany({
                where: {
                    employeeId: employee.id,
                    status: "COMPLETED",
                    checkIn: { gte: today }
                },
                select: { totalWork: true, totalBreak: true, totalIdle: true, checkIn: true, checkOut: true }
            })

            return NextResponse.json({
                active: false,
                todaySummary: {
                    totalWork: todaySessions.reduce((a, s) => a + s.totalWork, 0),
                    totalBreak: todaySessions.reduce((a, s) => a + s.totalBreak, 0),
                    totalIdle: todaySessions.reduce((a, s) => a + s.totalIdle, 0),
                    sessions: todaySessions.length,
                }
            })
        }

        // Calculate elapsed time
        const elapsedSec = Math.floor((Date.now() - new Date(session.checkIn).getTime()) / 1000)
        const lastSnapshot = session.snapshots[0]

        return NextResponse.json({
            active: true,
            session: {
                id: session.id,
                checkIn: session.checkIn,
                status: session.status,
                elapsedSec,
                isOnBreak: session.status === "BREAK",
                lastActivity: lastSnapshot?.status || "ACTIVE",
            }
        })
    } catch (error: any) {
        console.error("[TIME_TRACKER_STATUS]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
