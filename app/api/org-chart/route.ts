import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/org-chart — returns all active employees with hierarchy data for org chart
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                ...orgFilter(ctx),
                status: "ACTIVE",
                deletedAt: null,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                managerId: true,
                avatarUrl: true,
                employeeCode: true,
                email: true,
                department: { select: { id: true, name: true, color: true } },
                user: { select: { role: true } },
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })

        return apiSuccess(employees)
    } catch (error) {
        console.error("[ORG_CHART_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
