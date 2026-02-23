import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/attendance/:id
export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const record = await prisma.attendance.findUnique({
            where: { id },
            include: { employee: true },
        })

        if (!record) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 })
        }

        return NextResponse.json(record)
    } catch (error) {
        console.error("[ATTENDANCE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/attendance/:id – Update (check-out, edit record)
export async function PUT(req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()

        const existing = await prisma.attendance.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 })
        }

        const data: Record<string, unknown> = {}
        if (body.checkIn !== undefined) data.checkIn = body.checkIn ? new Date(body.checkIn) : null
        if (body.checkOut !== undefined) data.checkOut = body.checkOut ? new Date(body.checkOut) : null
        if (body.workHours !== undefined) data.workHours = body.workHours !== null ? parseFloat(body.workHours) : null
        if (body.status !== undefined) data.status = body.status

        const record = await prisma.attendance.update({
            where: { id },
            data,
            include: { employee: true },
        })

        return NextResponse.json(record)
    } catch (error) {
        console.error("[ATTENDANCE_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/attendance/:id
export async function DELETE(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        const existing = await prisma.attendance.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 })
        }

        await prisma.attendance.delete({ where: { id } })

        return NextResponse.json({ message: "Record deleted" })
    } catch (error) {
        console.error("[ATTENDANCE_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
