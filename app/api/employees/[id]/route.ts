import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/employees/[id] – Get single employee
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const employee = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id, deletedAt: null }),
            include: {
                department: true,
                assets: true,
                documents: true,
                leaves: true,
                resignations: true,
            },
        })

        if (!employee) {
            return apiError("Not found", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess(employee)
    } catch (error) {
        console.error("[EMPLOYEE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/employees/[id] – Update employee
export const PUT = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()

        const existing = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id }),
        })
        if (!existing) {
            return apiError("Employee not found", ApiErrorCode.NOT_FOUND, 404)
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

        return apiSuccess(employee)
    } catch (error) {
        console.error("[EMPLOYEE_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/employees/[id] – Soft-delete employee (archive)
export const DELETE = withAuth({ module: Module.EMPLOYEES, action: Action.DELETE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const existing = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id, deletedAt: null }),
        })
        if (!existing) {
            return apiError("Employee not found", ApiErrorCode.NOT_FOUND, 404)
        }

        await prisma.$transaction([
            // Soft-delete the employee — preserve all historical data
            prisma.employee.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    isArchived: true,
                    status: "ARCHIVED",
                },
            }),
            // Unassign assets
            prisma.asset.updateMany({
                where: { assignedToId: id },
                data: { assignedToId: null, assignedDate: null, status: "AVAILABLE" },
            }),
            // Remove as manager from other employees
            prisma.employee.updateMany({
                where: { managerId: id },
                data: { managerId: null },
            }),
        ])

        return apiSuccess({ message: "Employee archived successfully" })
    } catch (error) {
        console.error("[EMPLOYEE_DELETE]", error)
        return apiError("Failed to archive employee", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
