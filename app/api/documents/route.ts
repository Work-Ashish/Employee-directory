import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/documents – List all documents
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user?.role

        // Employees only see public docs + their own
        const documents = await prisma.document.findMany({
            where: role === "ADMIN"
                ? {}
                : {
                    OR: [
                        { isPublic: true },
                        { employeeId: session.user?.id },
                    ],
                },
            include: { employee: true },
            orderBy: { uploadDate: "desc" },
        })

        return NextResponse.json(documents)
    } catch (error) {
        console.error("[DOCUMENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/documents – Upload document metadata
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const document = await prisma.document.create({
            data: {
                title: body.title,
                category: body.category,
                url: body.url,
                size: body.size,
                isPublic: body.isPublic ?? false,
                employeeId: body.employeeId || null,
            },
            include: { employee: true },
        })

        return NextResponse.json(document, { status: 201 })
    } catch (error) {
        console.error("[DOCUMENTS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
