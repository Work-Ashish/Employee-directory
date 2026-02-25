import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"
import { headers } from "next/headers"

export async function POST() {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Check for already-active session
        const existing = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: "ACTIVE" }
        })
        if (existing) {
            return NextResponse.json({ error: "Already checked in", session: existing }, { status: 409 })
        }

        const headersList = await headers()
        const now = new Date()

        const session = await prisma.timeSession.create({
            data: {
                employeeId: employee.id,
                checkIn: now,
                ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown",
                userAgent: headersList.get("user-agent") || "unknown",
            }
        })

        // Synchronize with Attendance record for the day
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        let attendance = await prisma.attendance.findFirst({
            where: {
                employeeId: employee.id,
                date: {
                    gte: startOfDay,
                    lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        })

        if (!attendance) {
            await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: startOfDay,
                    checkIn: now,
                    status: "PRESENT"
                }
            })
        }

        return NextResponse.json(session, { status: 201 })
    } catch (error: any) {
        console.error("[TIME_TRACKER_CHECKIN]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
