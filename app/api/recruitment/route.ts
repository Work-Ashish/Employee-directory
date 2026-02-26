import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/recruitment – List candidates
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const stage = searchParams.get("stage")

        const where: Record<string, unknown> = {}
        if (stage) where.stage = stage

        const candidates = await prisma.candidate.findMany({
            where,
            include: { department: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(candidates)
    } catch (error) {
        console.error("[RECRUITMENT_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/recruitment – Add a candidate
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const candidate = await prisma.candidate.create({
            data: {
                name: body.name,
                email: body.email,
                phone: body.phone,
                role: body.role,
                stage: body.stage || "APPLICATION",
                status: body.status || "NEW",
                interviewDate: body.interviewDate ? new Date(body.interviewDate) : null,
                notes: body.notes,
                departmentId: body.departmentId || null,
            },
            include: { department: true },
        })

        return NextResponse.json(candidate, { status: 201 })
    } catch (error) {
        console.error("[RECRUITMENT_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/recruitment – Update candidate stage/status
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const candidate = await prisma.candidate.update({
            where: { id: body.id },
            data: {
                stage: body.stage,
                status: body.status,
                interviewDate: body.interviewDate ? new Date(body.interviewDate) : undefined,
                notes: body.notes,
            },
            include: { department: true },
        })

        return NextResponse.json(candidate)
    } catch (error) {
        console.error("[RECRUITMENT_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
