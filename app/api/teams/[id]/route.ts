import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { teamSchema } from "@/lib/schemas"

// GET /api/teams/:id
export const GET = withAuth({ module: Module.TEAMS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const team = await prisma.team.findFirst({
            where: orgFilter(ctx, { id }),
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
                members: {
                    include: {
                        employee: {
                            select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true, email: true }
                        }
                    }
                },
            },
        })
        if (!team) return apiError("Team not found", ApiErrorCode.NOT_FOUND, 404)
        return apiSuccess(team)
    } catch (error) {
        return apiError("Failed to fetch team", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/teams/:id
export const PUT = withAuth({ module: Module.TEAMS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()
        const parsed = teamSchema.partial().safeParse(body)
        if (!parsed.success) {
            return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const existing = await prisma.team.findFirst({ where: orgFilter(ctx, { id }) })
        if (!existing) return apiError("Team not found", ApiErrorCode.NOT_FOUND, 404)

        const team = await prisma.team.update({
            where: { id },
            data: parsed.data,
            include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
            },
        })
        return apiSuccess(team)
    } catch (error: any) {
        if (error?.code === "P2002") {
            return apiError("A team with this name already exists", ApiErrorCode.CONFLICT, 409)
        }
        return apiError("Failed to update team", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/teams/:id
export const DELETE = withAuth({ module: Module.TEAMS, action: Action.DELETE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const existing = await prisma.team.findFirst({ where: orgFilter(ctx, { id }) })
        if (!existing) return apiError("Team not found", ApiErrorCode.NOT_FOUND, 404)

        await prisma.team.delete({ where: { id } })
        return apiSuccess({ deleted: true })
    } catch (error) {
        return apiError("Failed to delete team", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
