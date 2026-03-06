import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { teamMemberSchema } from "@/lib/schemas"

// GET /api/teams/:id/members
export const GET = withAuth({ module: Module.TEAMS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const team = await prisma.team.findFirst({ where: orgFilter(ctx, { id }) })
        if (!team) return apiError("Team not found", ApiErrorCode.NOT_FOUND, 404)

        const members = await prisma.teamMember.findMany({
            where: { teamId: id },
            include: {
                employee: {
                    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, designation: true }
                }
            },
            orderBy: { joinedAt: "asc" },
        })
        return apiSuccess(members)
    } catch (error) {
        return apiError("Failed to fetch members", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/teams/:id/members – Add a member
export const POST = withAuth({ module: Module.TEAMS, action: Action.ASSIGN }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()
        const { employeeId } = body

        if (!employeeId) {
            return apiError("employeeId is required", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        // Verify team exists in org
        const team = await prisma.team.findFirst({ where: orgFilter(ctx, { id }) })
        if (!team) return apiError("Team not found", ApiErrorCode.NOT_FOUND, 404)

        // Verify employee exists in org
        const employee = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id: employeeId }),
        })
        if (!employee) return apiError("Employee not found", ApiErrorCode.NOT_FOUND, 404)

        const member = await prisma.teamMember.create({
            data: { teamId: id, employeeId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true } }
            },
        })
        return apiSuccess(member, undefined, 201)
    } catch (error: any) {
        if (error?.code === "P2002") {
            return apiError("Employee is already a member of this team", ApiErrorCode.CONFLICT, 409)
        }
        return apiError("Failed to add member", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/teams/:id/members – Remove a member (employeeId in body)
export const DELETE = withAuth({ module: Module.TEAMS, action: Action.ASSIGN }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        if (!employeeId) {
            return apiError("employeeId query param is required", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        const team = await prisma.team.findFirst({ where: orgFilter(ctx, { id }) })
        if (!team) return apiError("Team not found", ApiErrorCode.NOT_FOUND, 404)

        const membership = await prisma.teamMember.findUnique({
            where: { teamId_employeeId: { teamId: id, employeeId } },
        })
        if (!membership) return apiError("Member not found in team", ApiErrorCode.NOT_FOUND, 404)

        await prisma.teamMember.delete({
            where: { id: membership.id },
        })
        return apiSuccess({ removed: true })
    } catch (error) {
        return apiError("Failed to remove member", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
