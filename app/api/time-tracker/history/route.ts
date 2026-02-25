import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function GET(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const date = searchParams.get("date")        // YYYY-MM-DD
        const range = searchParams.get("range")       // "week" | "month"

        let startDate: Date
        let endDate: Date = new Date()
        endDate.setHours(23, 59, 59, 999)

        if (date) {
            startDate = new Date(date)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(date)
            endDate.setHours(23, 59, 59, 999)
        } else if (range === "week") {
            startDate = new Date()
            startDate.setDate(startDate.getDate() - 7)
            startDate.setHours(0, 0, 0, 0)
        } else if (range === "month") {
            startDate = new Date()
            startDate.setDate(1)
            startDate.setHours(0, 0, 0, 0)
        } else {
            // Default: today
            startDate = new Date()
            startDate.setHours(0, 0, 0, 0)
        }

        const sessions = await prisma.timeSession.findMany({
            where: {
                employeeId: employee.id,
                checkIn: { gte: startDate, lte: endDate },
            },
            orderBy: { checkIn: "desc" },
            include: {
                breaks: {
                    select: { id: true, startedAt: true, endedAt: true, reason: true }
                },
                activities: {
                    select: { appName: true, domain: true, category: true, durationSec: true },
                    orderBy: { durationSec: "desc" },
                    take: 20
                },
            }
        })

        // Aggregate summaries
        const summary = {
            totalSessions: sessions.length,
            totalWork: sessions.reduce((a, s) => a + s.totalWork, 0),
            totalBreak: sessions.reduce((a, s) => a + s.totalBreak, 0),
            totalIdle: sessions.reduce((a, s) => a + s.totalIdle, 0),
        }

        return NextResponse.json({ sessions, summary })
    } catch (error: any) {
        console.error("[TIME_TRACKER_HISTORY]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
