import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter, type AuthContext } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { functionalRoleSchema } from "@/lib/schemas"

// GET /api/roles — list all functional roles for the organization
export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (_req: Request, ctx: AuthContext) => {
    const roles = await prisma.functionalRole.findMany({
        where: orgFilter(ctx),
        include: {
            capabilities: true,
            parentRole: { select: { id: true, name: true } },
            _count: { select: { employees: true, childRoles: true } },
        },
        orderBy: [{ level: "desc" }, { name: "asc" }],
    })

    return apiSuccess(roles)
})

// POST /api/roles — create a new functional role
export const POST = withAuth({ module: Module.SETTINGS, action: Action.CREATE }, async (req: Request, ctx: AuthContext) => {
    const body = await req.json()
    const parsed = functionalRoleSchema.safeParse(body)
    if (!parsed.success) {
        return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.flatten())
    }

    const { name, description, level, parentRoleId, capabilities } = parsed.data

    // Validate parent role belongs to same org
    if (parentRoleId) {
        const parent = await prisma.functionalRole.findFirst({
            where: { id: parentRoleId, organizationId: ctx.organizationId },
        })
        if (!parent) {
            return apiError("Parent role not found", ApiErrorCode.NOT_FOUND, 404)
        }
    }

    // Check for duplicate name within org
    const existing = await prisma.functionalRole.findFirst({
        where: { name, organizationId: ctx.organizationId },
    })
    if (existing) {
        return apiError("A role with this name already exists", ApiErrorCode.CONFLICT, 409)
    }

    const role = await prisma.functionalRole.create({
        data: {
            name,
            description,
            level,
            parentRoleId,
            organizationId: ctx.organizationId,
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

    return apiSuccess(role, undefined, 201)
})
