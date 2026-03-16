import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/employees/managers — list manager candidates for dropdown
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const departmentId = searchParams.get("departmentId")
        const excludeId = searchParams.get("excludeId")

        const where: any = {
            ...orgFilter(ctx),
            status: "ACTIVE",
            deletedAt: null,
        }

        if (departmentId) {
            where.departmentId = departmentId
        }

        if (excludeId) {
            where.id = { not: excludeId }
        }

        const managers = await prisma.employee.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                department: { select: { name: true } },
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })

        return apiSuccess(managers)
    } catch (error) {
        console.error("[MANAGERS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
