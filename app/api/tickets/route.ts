import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getSessionEmployee } from "@/lib/session-employee"
import crypto from "crypto"

// GET /api/tickets – List help desk tickets
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

        // Non-admins can only see their own tickets
        if (session.user?.role !== "ADMIN") {
            const employee = await getSessionEmployee()
            if (employee) where.employeeId = employee.id
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const tickets = await prisma.ticket.findMany({
            where,
            include: { employee: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(tickets)
    } catch (error) {
        console.error("[TICKETS_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/tickets – Create a ticket
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        // Generate collision-resistant ticket code using UUID
        const shortId = crypto.randomUUID().slice(0, 8).toUpperCase()
        const ticketCode = `TKT-${new Date().getFullYear()}-${shortId}`

        const ticket = await prisma.ticket.create({
            data: {
                ticketCode,
                subject: body.subject,
                description: body.description,
                category: body.category,
                priority: body.priority || "MEDIUM",
                status: "OPEN",
                employeeId: body.employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(ticket, { status: 201 })
    } catch (error) {
        console.error("[TICKETS_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/tickets – Update ticket status
export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        const ticket = await prisma.ticket.update({
            where: { id: body.id },
            data: {
                status: body.status,
                priority: body.priority,
            },
            include: { employee: true },
        })

        return NextResponse.json(ticket)
    } catch (error) {
        console.error("[TICKETS_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
