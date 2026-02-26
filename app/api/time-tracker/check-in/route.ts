import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"
import { headers } from "next/headers"

export async function POST() {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const headersList = await headers()
        const now = new Date()

        // Use a transaction to atomically check + create (prevents TOCTOU race)
        const result = await prisma.$transaction(async (tx) => {
            // Check for already-active session inside the transaction
            const existing = await tx.timeSession.findFirst({
                where: { employeeId: employee.id, status: "ACTIVE" }
            })
            if (existing) {
                return { alreadyExists: true, session: existing }
            }

            const session = await tx.timeSession.create({
                data: {
                    employeeId: employee.id,
                    checkIn: now,
                    ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown",
                    userAgent: headersList.get("user-agent") || "unknown",
                }
            })

            // Synchronize with Attendance record for the day
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const attendance = await tx.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    date: {
                        gte: startOfDay,
                        lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            })

            if (!attendance) {
                await tx.attendance.create({
                    data: {
                        employeeId: employee.id,
                        organizationId: employee.organizationId,
                        date: startOfDay,
                        checkIn: now,
                        status: "PRESENT"
                    }
                })
            }

            return { alreadyExists: false, session }
        })

        if (result.alreadyExists) {
            return NextResponse.json({ error: "Already checked in", session: result.session }, { status: 409 })
        }

        return NextResponse.json(result.session, { status: 201 })
    } catch (error: any) {
        console.error("[TIME_TRACKER_CHECKIN]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
