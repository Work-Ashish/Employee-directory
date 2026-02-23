import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/leaves/:id
export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: { employee: true },
        })

        if (!leave) {
            return NextResponse.json({ error: "Leave not found" }, { status: 404 })
        }

        if (session.user?.role !== "ADMIN" && leave.employeeId !== session.user?.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json(leave)
    } catch (error) {
        console.error("[LEAVE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/leaves/:id – Approve/Reject or update a leave
export async function PUT(req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await req.json()

        const existing = await prisma.leave.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Leave not found" }, { status: 404 })
        }

        const leave = await prisma.leave.update({
            where: { id },
            data: { status: body.status },
            include: { employee: true },
        })

        return NextResponse.json(leave)
    } catch (error) {
        console.error("[LEAVE_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/leaves/:id
export async function DELETE(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const existing = await prisma.leave.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Leave not found" }, { status: 404 })
        }

        if (session.user?.role !== "ADMIN" && existing.employeeId !== session.user?.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        if (existing.status !== "PENDING" && session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Can only cancel pending requests" }, { status: 400 })
        }

        await prisma.leave.delete({ where: { id } })

        return NextResponse.json({ message: "Leave request deleted" })
    } catch (error) {
        console.error("[LEAVE_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
