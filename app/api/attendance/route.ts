import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/attendance – List attendance records
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const date = searchParams.get("date")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = {}
        if (date) where.date = new Date(date)
        if (employeeId) where.employeeId = employeeId

        if (session.user?.role !== "ADMIN") {
            const employee = await prisma.employee.findFirst({
                where: { userId: session.user?.id },
            })
            if (employee) {
                where.employeeId = employee.id
            } else {
                return NextResponse.json([])
            }
        }

        const records = await prisma.attendance.findMany({
            where,
            include: { employee: true },
            orderBy: { date: "desc" },
        })

        return NextResponse.json(records)
    } catch (error) {
        console.error("[ATTENDANCE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/attendance – Check in / Create record
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        let employeeId = body.employeeId
        if (!employeeId) {
            const employee = await prisma.employee.findFirst({
                where: { userId: session.user?.id },
            })
            if (!employee) {
                return NextResponse.json({ error: "No employee profile linked to your account" }, { status: 400 })
            }
            employeeId = employee.id
        } else if (session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Only admins can create attendance for other employees" }, { status: 403 })
        }

        const record = await prisma.attendance.create({
            data: {
                date: new Date(body.date || new Date()),
                checkIn: body.checkIn ? new Date(body.checkIn) : null,
                checkOut: body.checkOut ? new Date(body.checkOut) : null,
                workHours: body.workHours ? parseFloat(body.workHours) : null,
                status: body.status || "PRESENT",
                employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        console.error("[ATTENDANCE_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
