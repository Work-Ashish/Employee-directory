import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

const IDLE_THRESHOLD = 5 // consecutive zero-activity snapshots to mark as idle

export async function POST(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { mouseClicks, keystrokes } = await req.json() as { mouseClicks: number; keystrokes: number }

        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } }
        })
        if (!session) {
            return NextResponse.json({ error: "No active session" }, { status: 404 })
        }

        const isActive = mouseClicks > 0 || keystrokes > 0

        // Check for idle detection: get last N snapshots
        let status: "ACTIVE" | "IDLE" | "BREAK" = session.status === "BREAK" ? "BREAK" : (isActive ? "ACTIVE" : "IDLE")

        if (!isActive && session.status !== "BREAK") {
            const recentSnapshots = await prisma.activitySnapshot.findMany({
                where: { sessionId: session.id },
                orderBy: { timestamp: "desc" },
                take: IDLE_THRESHOLD - 1,
                select: { mouseClicks: true, keystrokes: true }
            })

            const allIdle = recentSnapshots.every(s => s.mouseClicks === 0 && s.keystrokes === 0)
            status = (allIdle && recentSnapshots.length >= IDLE_THRESHOLD - 1) ? "IDLE" : "ACTIVE"
        }

        const snapshot = await prisma.activitySnapshot.create({
            data: {
                sessionId: session.id,
                status,
                mouseClicks,
                keystrokes,
            }
        })

        return NextResponse.json({ snapshot, status })
    } catch (error: any) {
        console.error("[TIME_TRACKER_HEARTBEAT]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
