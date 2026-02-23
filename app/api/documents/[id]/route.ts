import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/documents/:id
export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const document = await prisma.document.findUnique({
            where: { id },
            include: { employee: true },
        })

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 })
        }

        if (
            session.user?.role !== "ADMIN" &&
            !document.isPublic &&
            document.employeeId !== session.user?.id
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json(document)
    } catch (error) {
        console.error("[DOCUMENT_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/documents/:id
export async function PUT(req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await req.json()

        const existing = await prisma.document.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 })
        }

        const document = await prisma.document.update({
            where: { id },
            data: {
                title: body.title,
                category: body.category,
                url: body.url,
                size: body.size ?? null,
                isPublic: body.isPublic ?? false,
                employeeId: body.employeeId ?? null,
            },
            include: { employee: true },
        })

        return NextResponse.json(document)
    } catch (error) {
        console.error("[DOCUMENT_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/documents/:id
export async function DELETE(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        const existing = await prisma.document.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 })
        }

        await prisma.document.delete({ where: { id } })

        return NextResponse.json({ message: "Document deleted" })
    } catch (error) {
        console.error("[DOCUMENT_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
