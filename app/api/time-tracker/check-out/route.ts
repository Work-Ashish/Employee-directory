import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function POST() {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } },
            include: { breaks: { where: { endedAt: null } } }
        })

        if (!session) {
            return NextResponse.json({ error: "No active session" }, { status: 404 })
        }

        const now = new Date()
        const elapsedSec = Math.floor((now.getTime() - new Date(session.checkIn).getTime()) / 1000)

        // Close any open break
        if (session.breaks.length > 0) {
            for (const b of session.breaks) {
                await prisma.breakEntry.update({
                    where: { id: b.id },
                    data: { endedAt: now }
                })
            }
        }

        // Calculate total break time
        const allBreaks = await prisma.breakEntry.findMany({ where: { sessionId: session.id } })
        const totalBreakSec = allBreaks.reduce((acc, b) => {
            const end = b.endedAt || now
            return acc + Math.floor((end.getTime() - new Date(b.startedAt).getTime()) / 1000)
        }, 0)

        // Calculate total idle from snapshots
        const idleSnapshots = await prisma.activitySnapshot.count({
            where: { sessionId: session.id, status: "IDLE" }
        })
        const totalIdleSec = idleSnapshots * 60 // each snapshot = 60 seconds

        const totalWorkSec = Math.max(0, elapsedSec - totalBreakSec - totalIdleSec)

        const updated = await prisma.timeSession.update({
            where: { id: session.id },
            data: {
                checkOut: now,
                status: "COMPLETED",
                totalWork: totalWorkSec,
                totalBreak: totalBreakSec,
                totalIdle: totalIdleSec,
            }
        })

        // Synchronize with Attendance record
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const attendance = await prisma.attendance.findFirst({
            where: {
                employeeId: employee.id,
                date: {
                    gte: startOfDay,
                    lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        })

        if (attendance) {
            const addedHours = totalWorkSec / 3600
            await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOut: now,
                    workHours: (attendance.workHours || 0) + addedHours
                }
            })
        }

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("[TIME_TRACKER_CHECKOUT]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
