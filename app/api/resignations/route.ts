import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/resignations – List resignations
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

        const resignations = await prisma.resignation.findMany({
            where,
            include: { employee: { include: { department: true } } },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(resignations)
    } catch (error) {
        console.error("[RESIGNATIONS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/resignations – Submit resignation
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        const resignation = await prisma.resignation.create({
            data: {
                reason: body.reason,
                lastDay: new Date(body.lastDay),
                status: "UNDER_REVIEW",
                employeeId: body.employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(resignation, { status: 201 })
    } catch (error) {
        console.error("[RESIGNATIONS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/resignations – Update resignation status
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const resignation = await prisma.resignation.update({
            where: { id: body.id },
            data: { status: body.status },
            include: { employee: true },
        })

        return NextResponse.json(resignation)
    } catch (error) {
        console.error("[RESIGNATIONS_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
