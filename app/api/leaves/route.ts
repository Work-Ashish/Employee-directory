import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/leaves – List leave requests
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = {}
        if (status) where.status = status
        if (employeeId) where.employeeId = employeeId

        const leaves = await prisma.leave.findMany({
            where,
            include: { employee: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(leaves)
    } catch (error) {
        console.error("[LEAVES_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/leaves – Submit a leave request
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
            return NextResponse.json({ error: "Only admins can create leave for other employees" }, { status: 403 })
        }

        const leave = await prisma.leave.create({
            data: {
                type: body.type,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                reason: body.reason,
                status: "PENDING",
                employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(leave, { status: 201 })
    } catch (error) {
        console.error("[LEAVES_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/leaves – Approve/Reject a leave
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const leave = await prisma.leave.update({
            where: { id: body.id },
            data: { status: body.status },
            include: { employee: true },
        })

        return NextResponse.json(leave)
    } catch (error) {
        console.error("[LEAVES_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
