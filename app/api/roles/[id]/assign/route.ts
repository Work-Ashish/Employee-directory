import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter, type AuthContext } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { roleAssignSchema } from "@/lib/schemas"

// POST /api/roles/[id]/assign — assign employees to a functional role
export const POST = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, async (req: Request, ctx: AuthContext) => {
    const body = await req.json()
    const parsed = roleAssignSchema.safeParse(body)
    if (!parsed.success) {
        return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.flatten())
    }

    // Verify role exists in this org
    const role = await prisma.functionalRole.findFirst({
        where: { id: ctx.params.id, ...orgFilter(ctx) },
    })
    if (!role) {
        return apiError("Role not found", ApiErrorCode.NOT_FOUND, 404)
    }

    // Verify all employees belong to this org
    const employees = await prisma.employee.findMany({
        where: { id: { in: parsed.data.employeeIds }, organizationId: ctx.organizationId },
        select: { id: true },
    })
    const validIds = new Set(employees.map((e) => e.id))
    const invalidIds = parsed.data.employeeIds.filter((id) => !validIds.has(id))
    if (invalidIds.length > 0) {
        return apiError(`Employees not found: ${invalidIds.join(", ")}`, ApiErrorCode.NOT_FOUND, 404)
    }

    // Upsert assignments (skip duplicates)
    const results = await prisma.$transaction(
        parsed.data.employeeIds.map((employeeId) =>
            prisma.employeeFunctionalRole.upsert({
                where: { employeeId_functionalRoleId: { employeeId, functionalRoleId: ctx.params.id } },
                create: { employeeId, functionalRoleId: ctx.params.id },
                update: {},
            })
        )
    )

    return apiSuccess({ assigned: results.length })
})

// DELETE /api/roles/[id]/assign — unassign employees from a functional role
export const DELETE = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, async (req: Request, ctx: AuthContext) => {
    const body = await req.json()
    const parsed = roleAssignSchema.safeParse(body)
    if (!parsed.success) {
        return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.flatten())
    }

    // Verify role exists
    const role = await prisma.functionalRole.findFirst({
        where: { id: ctx.params.id, ...orgFilter(ctx) },
    })
    if (!role) {
        return apiError("Role not found", ApiErrorCode.NOT_FOUND, 404)
    }

    const result = await prisma.employeeFunctionalRole.deleteMany({
        where: {
            functionalRoleId: ctx.params.id,
            employeeId: { in: parsed.data.employeeIds },
        },
    })

    return apiSuccess({ unassigned: result.count })
})
