import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { z } from "zod"
import { indexEmployee } from "@/lib/search-index"

const employeeUpdateSchema = z.object({
    employeeCode: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().nullable().optional(),
    designation: z.string().optional(),
    departmentId: z.string().optional(),
    dateOfJoining: z.string().optional(),
    salary: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    status: z.enum(["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED", "INACTIVE", "ARCHIVED"]).optional(),
    role: z.enum(["CEO", "HR", "PAYROLL", "TEAM_LEAD", "EMPLOYEE"]).optional(),
    address: z.string().nullable().optional(),
    managerId: z.string().nullable().optional(),
}).superRefine((val, ctx) => {
    if (val.role && val.role !== "CEO" && val.managerId === null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot clear manager for non-CEO employees",
            path: ["managerId"],
        })
    }
})

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
        const raw = await req.json()
        const parsed = employeeUpdateSchema.safeParse(raw)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }
        const body = parsed.data

        const existing = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id }),
        })
        if (!existing) {
            return apiError("Employee not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Validate manager exists if provided
        if (body.managerId) {
            const manager = await prisma.employee.findFirst({
                where: { id: body.managerId, organizationId: ctx.organizationId, status: "ACTIVE" },
                select: { id: true },
            })
            if (!manager) {
                return apiError("Manager not found in your organization", ApiErrorCode.NOT_FOUND, 404)
            }
        }

        // Update employee + user role in a transaction
        const employee = await prisma.$transaction(async (tx) => {
            const emp = await tx.employee.update({
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
                    salary: body.salary,
                    status: body.status,
                    address: body.address ?? undefined,
                    managerId: body.managerId ?? undefined,
                },
                include: { department: true },
            })

            // Update user role if provided
            if (body.role && existing.userId) {
                await tx.user.update({
                    where: { id: existing.userId },
                    data: { role: body.role as any },
                })
            }

            return emp
        })

        indexEmployee(id).catch(() => {})

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

        await prisma.$transaction(async (tx) => {
            // Soft-delete the employee — preserve all historical data
            await tx.employee.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    isArchived: true,
                    status: "ARCHIVED",
                },
            })
            // Unassign assets
            await tx.asset.updateMany({
                where: { assignedToId: id },
                data: { assignedToId: null, assignedDate: null, status: "AVAILABLE" },
            })
            // Remove as manager from other employees
            await tx.employee.updateMany({
                where: { managerId: id },
                data: { managerId: null },
            })
            // Remove from teams
            await tx.teamMember.deleteMany({
                where: { employeeId: id },
            })
            // Revoke portal access — revoke all active sessions so user is logged out
            if (existing.userId) {
                await tx.userSession.updateMany({
                    where: { userId: existing.userId, isRevoked: false },
                    data: { isRevoked: true },
                })
            }
        })

        indexEmployee(id).catch(() => {})

        return apiSuccess({ message: "Employee archived successfully" })
    } catch (error) {
        console.error("[EMPLOYEE_DELETE]", error)
        return apiError("Failed to archive employee", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
