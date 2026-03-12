import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"

// DELETE /api/departments/[id] – Delete a department
export const DELETE = withAuth({ module: Module.EMPLOYEES, action: Action.DELETE }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        // Check if any employees are still assigned to this department
        const employeeCount = await prisma.employee.count({
            where: { departmentId: id, organizationId: ctx.organizationId, deletedAt: null }
        })

        if (employeeCount > 0) {
            return apiError(
                "Cannot delete department",
                ApiErrorCode.CONFLICT,
                409,
                { details: `${employeeCount} employee(s) are still assigned to this department. Reassign them first.` }
            )
        }

        await prisma.department.delete({ where: { id, organizationId: ctx.organizationId } })

        return apiSuccess({ success: true })
    } catch (error: any) {
        console.error("[DEPARTMENT_DELETE]", error)
        if (error.code === "P2025") {
            return apiError("Department not found", ApiErrorCode.NOT_FOUND, 404)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
