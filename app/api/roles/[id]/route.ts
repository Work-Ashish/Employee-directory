import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter, type AuthContext } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { functionalRoleSchema } from "@/lib/schemas"

// GET /api/roles/[id] — get a single functional role with details
export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (_req: Request, ctx: AuthContext) => {
    const role = await prisma.functionalRole.findFirst({
        where: { id: ctx.params.id, ...orgFilter(ctx) },
        include: {
            capabilities: true,
            parentRole: { select: { id: true, name: true, level: true } },
            childRoles: { select: { id: true, name: true, level: true } },
            employees: {
                include: {
                    employee: {
                        select: { id: true, firstName: true, lastName: true, designation: true, email: true, department: { select: { name: true } } },
                    },
                },
            },
        },
    })

    if (!role) {
        return apiError("Role not found", ApiErrorCode.NOT_FOUND, 404)
    }

    return apiSuccess(role)
})

// PUT /api/roles/[id] — update a functional role
export const PUT = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, async (req: Request, ctx: AuthContext) => {
    const body = await req.json()
    const parsed = functionalRoleSchema.safeParse(body)
    if (!parsed.success) {
        return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.flatten())
    }

    const existing = await prisma.functionalRole.findFirst({
        where: { id: ctx.params.id, ...orgFilter(ctx) },
    })
    if (!existing) {
        return apiError("Role not found", ApiErrorCode.NOT_FOUND, 404)
    }

    const { name, description, level, parentRoleId, capabilities } = parsed.data

    // Prevent self-referential parent
    if (parentRoleId === ctx.params.id) {
        return apiError("A role cannot be its own parent", ApiErrorCode.BAD_REQUEST, 400)
    }

    // Validate parent role
    if (parentRoleId) {
        const parent = await prisma.functionalRole.findFirst({
            where: { id: parentRoleId, organizationId: ctx.organizationId },
        })
        if (!parent) {
            return apiError("Parent role not found", ApiErrorCode.NOT_FOUND, 404)
        }
    }

    // Check name uniqueness (excluding self)
    if (name !== existing.name) {
        const dup = await prisma.functionalRole.findFirst({
            where: { name, organizationId: ctx.organizationId, id: { not: ctx.params.id } },
        })
        if (dup) {
            return apiError("A role with this name already exists", ApiErrorCode.CONFLICT, 409)
        }
    }

    // Update role + replace capabilities in a transaction
    const role = await prisma.$transaction(async (tx) => {
        // Delete old capabilities
        await tx.roleCapability.deleteMany({ where: { functionalRoleId: ctx.params.id } })

        // Update role + create new capabilities
        return tx.functionalRole.update({
            where: { id: ctx.params.id },
            data: {
                name,
                description,
                level,
                parentRoleId,
                capabilities: {
                    create: capabilities.map((cap) => ({
                        module: cap.module,
                        actions: cap.actions,
                    })),
                },
            },
            include: {
                capabilities: true,
                parentRole: { select: { id: true, name: true } },
                _count: { select: { employees: true } },
            },
        })
    })

    return apiSuccess(role)
})

// DELETE /api/roles/[id] — delete a functional role
export const DELETE = withAuth({ module: Module.SETTINGS, action: Action.DELETE }, async (_req: Request, ctx: AuthContext) => {
    const existing = await prisma.functionalRole.findFirst({
        where: { id: ctx.params.id, ...orgFilter(ctx) },
        include: { _count: { select: { childRoles: true } } },
    })
    if (!existing) {
        return apiError("Role not found", ApiErrorCode.NOT_FOUND, 404)
    }

    if (existing._count.childRoles > 0) {
        return apiError("Cannot delete a role that has child roles. Remove or reassign child roles first.", ApiErrorCode.BAD_REQUEST, 400)
    }

    await prisma.functionalRole.delete({ where: { id: ctx.params.id } })

    return apiSuccess({ deleted: true })
})
