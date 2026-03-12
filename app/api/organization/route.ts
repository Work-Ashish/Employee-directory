import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/organization (Scoped)
export const GET = withAuth({ module: Module.ORGANIZATION, action: Action.VIEW }, async (req, ctx) => {
    try {
        const employees = await prisma.employee.findMany({
            where: { organizationId: ctx.organizationId, deletedAt: null },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                employeeCode: true,
                email: true,
                phone: true,
                dateOfJoining: true,
                salary: true,
                status: true,
                avatarUrl: true,
                managerId: true,
                departmentId: true,
                department: { select: { id: true, name: true, color: true } },
            },
            orderBy: { createdAt: "asc" },
        })

        return apiSuccess(employees)
    } catch (error) {
        console.error("[ORGANIZATION_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/organization
// Accept drag and drop updates to manager hierarchy
export const PUT = withAuth({ module: Module.ORGANIZATION, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const updates = await req.json()

        if (!Array.isArray(updates)) {
            return apiError("Invalid payload format", ApiErrorCode.BAD_REQUEST, 400)
        }

        // Cycle detection
        for (const update of updates) {
            if (!update.managerId || update.managerId === update.id) {
                if (update.managerId === update.id) {
                    return apiError("Employee cannot be their own manager", ApiErrorCode.BAD_REQUEST, 400)
                }
                continue
            }

            const proposedManagers = new Map(updates.map((u: any) => [u.id, u.managerId]))
            let current = update.managerId
            const visited = new Set<string>([update.id])
            let depth = 0

            while (current && depth < 50) {
                if (visited.has(current)) {
                    return apiError("Circular dependency detected", ApiErrorCode.BAD_REQUEST, 400)
                }
                visited.add(current)
                if (proposedManagers.has(current)) {
                    current = proposedManagers.get(current) || null
                } else {
                    const parent = await prisma.employee.findFirst({
                        where: { id: current, organizationId: ctx.organizationId },
                        select: { managerId: true }
                    })
                    current = parent?.managerId || null
                }
                depth++
            }
        }

        const operations = updates.map((update: any) =>
            prisma.employee.update({
                where: { id: update.id, organizationId: ctx.organizationId },
                data: { managerId: update.managerId }
            })
        )

        await prisma.$transaction(operations)
        return apiSuccess({ updatedCount: operations.length })
    } catch (error) {
        console.error("[ORGANIZATION_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
