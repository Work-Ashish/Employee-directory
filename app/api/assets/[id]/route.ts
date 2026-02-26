import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/assets/:id
export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: { assignedTo: true },
        })

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 })
        }

        return NextResponse.json(asset)
    } catch (error) {
        console.error("[ASSET_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/assets/:id
export async function PUT(req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await req.json()

        const existing = await prisma.asset.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 })
        }

        const asset = await prisma.asset.update({
            where: { id },
            data: {
                name: body.name,
                type: body.type,
                serialNumber: body.serialNumber,
                status: body.status,
                purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
                value: body.value !== undefined ? parseFloat(body.value) : undefined,
                image: body.image,
                assignedToId: body.assignedToId ?? null,
                assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
            },
            include: { assignedTo: true },
        })

        return NextResponse.json(asset)
    } catch (error) {
        console.error("[ASSET_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/assets/:id
export async function DELETE(_req: Request, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        const existing = await prisma.asset.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 })
        }

        await prisma.asset.delete({ where: { id } })

        return NextResponse.json({ message: "Asset deleted" })
    } catch (error) {
        console.error("[ASSET_DELETE]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
