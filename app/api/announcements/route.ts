import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/announcements – List announcements
export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const announcements = await prisma.announcement.findMany({
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        })

        return NextResponse.json(announcements)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/announcements – Create an announcement
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const announcement = await prisma.announcement.create({
            data: {
                title: body.title,
                content: body.content,
                author: body.author || session.user?.name || "Admin",
                category: body.category,
                priority: body.priority || "MEDIUM",
                isPinned: body.isPinned || false,
            },
        })

        return NextResponse.json(announcement, { status: 201 })
    } catch (error) {
        console.error("[ANNOUNCEMENTS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/announcements – Delete an announcement (by id in query)
export async function DELETE(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        await prisma.announcement.delete({ where: { id } })

        return NextResponse.json({ message: "Deleted" })
    } catch (error) {
        console.error("[ANNOUNCEMENTS_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
// PUT /api/announcements – Update an announcement
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()
        const { id, ...data } = body

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                title: data.title,
                content: data.content,
                category: data.category,
                priority: data.priority,
                isPinned: data.isPinned,
            },
        })

        return NextResponse.json(announcement)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
