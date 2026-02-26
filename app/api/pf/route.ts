import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/pf – List provident fund records
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

        const records = await prisma.providentFund.findMany({
            where,
            include: { employee: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(records)
    } catch (error) {
        console.error("[PF_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/pf – Create PF record
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const record = await prisma.providentFund.create({
            data: {
                month: body.month,
                accountNumber: body.accountNumber,
                basicSalary: parseFloat(body.basicSalary),
                employeeContribution: parseFloat(body.employeeContribution),
                employerContribution: parseFloat(body.employerContribution),
                totalContribution: parseFloat(body.totalContribution),
                status: body.status || "Credited",
                employeeId: body.employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        console.error("[PF_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
