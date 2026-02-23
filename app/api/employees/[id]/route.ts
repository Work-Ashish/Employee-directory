import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/employees/[id] – Get single employee
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // const session = await auth()
        // if (!session) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        // }

        const { id } = await params

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                assets: true,
                documents: true,
                leaves: true,
                resignations: true,
            },
        })

        if (!employee) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        return NextResponse.json(employee)
    } catch (error) {
        console.error("[EMPLOYEE_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// PUT /api/employees/[id] – Update employee
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // const session = await auth()
        // if (!session || session.user?.role !== "ADMIN") {
        //     return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        // }

        const { id } = await params
        const body = await req.json()

        const existing = await prisma.employee.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                employeeCode: body.employeeCode,
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                phone: body.phone ?? null,
                designation: body.designation,
                departmentId: body.departmentId,
                dateOfJoining: body.dateOfJoining ? new Date(body.dateOfJoining) : undefined,
                salary: body.salary !== undefined ? parseFloat(body.salary) : undefined,
                status: body.status,
                address: body.address ?? undefined,
                managerId: body.managerId ?? undefined,
            },
            include: { department: true },
        })

        return NextResponse.json(employee)
    } catch (error) {
        console.error("[EMPLOYEE_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE /api/employees/[id] – Delete employee and related records
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // const session = await auth()
        // if (!session || session.user?.role !== "ADMIN") {
        //     return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        // }

        const { id } = await params

        const existing = await prisma.employee.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        }

        await prisma.$transaction([
            prisma.attendance.deleteMany({ where: { employeeId: id } }),
            prisma.leave.deleteMany({ where: { employeeId: id } }),
            prisma.payroll.deleteMany({ where: { employeeId: id } }),
            prisma.providentFund.deleteMany({ where: { employeeId: id } }),
            prisma.performanceReview.deleteMany({ where: { employeeId: id } }),
            prisma.trainingEnrollment.deleteMany({ where: { employeeId: id } }),
            prisma.ticket.deleteMany({ where: { employeeId: id } }),
            prisma.resignation.deleteMany({ where: { employeeId: id } }),
            prisma.document.deleteMany({ where: { employeeId: id } }),
            prisma.asset.updateMany({ where: { assignedToId: id }, data: { assignedToId: null, assignedDate: null, status: "AVAILABLE" } }),
            prisma.employee.updateMany({ where: { managerId: id }, data: { managerId: null } }),
            prisma.employee.delete({ where: { id } }),
        ])

        return NextResponse.json({ message: "Deleted" })
    } catch (error) {
        console.error("[EMPLOYEE_DELETE]", error)
        return NextResponse.json({ error: "Failed to delete employee. They may have linked records." }, { status: 500 })
    }
}
