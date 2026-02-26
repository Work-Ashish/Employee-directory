import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/payroll – List payroll records
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const month = searchParams.get("month")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = {}
        if (month) where.month = month
        if (employeeId) where.employeeId = employeeId

        const records = await prisma.payroll.findMany({
            where,
            include: { employee: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(records)
    } catch (error) {
        console.error("[PAYROLL_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST /api/payroll – Create payroll entry
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await req.json()

        const record = await prisma.payroll.create({
            data: {
                month: body.month,
                basicSalary: parseFloat(body.basicSalary),
                allowances: parseFloat(body.allowances || "0"),
                pfDeduction: parseFloat(body.pfDeduction || "0"),
                tax: parseFloat(body.tax || "0"),
                otherDed: parseFloat(body.otherDed || "0"),
                netSalary: parseFloat(body.netSalary),
                status: body.status || "PENDING",
                employeeId: body.employeeId,
            },
            include: { employee: true },
        })

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        console.error("[PAYROLL_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
