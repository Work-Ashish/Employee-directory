import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { performanceReviewSchema } from "@/lib/schemas"

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
            include: { employee: { select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
            orderBy: { reviewDate: "desc" },
            take: 200,
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
        if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = performanceReviewSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation Error", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const review = await prisma.performanceReview.create({
            data: {
                rating: parsed.data.rating,
                progress: parsed.data.progress,
                comments: parsed.data.comments,
                reviewDate: parsed.data.reviewDate || new Date(),
                status: parsed.data.status,
                employeeId: parsed.data.employeeId,
                organizationId: session.user.organizationId,
            },
            include: { employee: { include: { department: true } } },
        })

        return NextResponse.json(review, { status: 201 })
    } catch (error) {
        console.error("[PERFORMANCE_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
