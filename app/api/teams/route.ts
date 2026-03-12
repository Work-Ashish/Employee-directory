import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { teamSchema } from "@/lib/schemas"

// GET /api/teams – List all teams
export const GET = withAuth({ module: Module.TEAMS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const teams = await prisma.team.findMany({
            where: orgFilter(ctx),
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                members: {
                    include: {
                        employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } }
                    }
                },
                _count: { select: { members: true } },
            },
            orderBy: { createdAt: "desc" },
        })
        return apiSuccess(teams)
    } catch (error) {
        return apiError("Failed to fetch teams", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/teams – Create a team
export const POST = withAuth({ module: Module.TEAMS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = teamSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const { name, description, leadId } = parsed.data

        // Verify lead exists in org
        const lead = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id: leadId, deletedAt: null }),
        })
        if (!lead) {
            return apiError("Team lead not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
                leadId,
                createdById: ctx.userId,
                organizationId: ctx.organizationId,
            },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
            },
        })

        return apiSuccess(team, undefined, 201)
    } catch (error: any) {
        if (error?.code === "P2002") {
            return apiError("A team with this name already exists", ApiErrorCode.CONFLICT, 409)
        }
        return apiError("Failed to create team", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
