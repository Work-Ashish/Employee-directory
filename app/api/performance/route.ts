import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/performance – List performance reviews
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = {}
        if (employeeId) where.employeeId = employeeId

        const reviews = await prisma.performanceReview.findMany({
            where,
            include: { employee: { include: { department: true } } },
            orderBy: { reviewDate: "desc" },
        })

        return NextResponse.json(reviews)
    } catch (error) {
        console.error("[PERFORMANCE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/performance – Create a performance review
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const review = await prisma.performanceReview.create({
            data: {
                rating: parseFloat(body.rating),
                progress: parseInt(body.progress || "0"),
                comments: body.comments,
                reviewDate: body.reviewDate ? new Date(body.reviewDate) : new Date(),
                status: body.status || "PENDING",
                employeeId: body.employeeId,
            },
            include: { employee: { include: { department: true } } },
        })

        return NextResponse.json(review, { status: 201 })
    } catch (error) {
        console.error("[PERFORMANCE_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
