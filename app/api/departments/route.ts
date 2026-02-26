import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/departments – List all departments
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const departments = await prisma.department.findMany({
            include: {
                _count: { select: { employees: true } },
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(departments)
    } catch (error) {
        console.error("[DEPARTMENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/departments – Create a department
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const department = await prisma.department.create({
            data: {
                name: body.name,
                color: body.color,
            },
        })

        return NextResponse.json(department, { status: 201 })
    } catch (error: any) {
        console.error("[DEPARTMENTS_POST]", error)

        // Handle unique constraint violation (Prisma P2002)
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "Conflict", details: "A department with this name already exists." },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
