import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { shiftAssignmentSchema } from "@/lib/schemas/attendance"
import { Module, Action } from "@/lib/permissions"

// POST /api/attendance/shifts/assign – Assign a shift to an employee
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validatedData = shiftAssignmentSchema.parse(body)

        // Check if shift exists in the organization
        const shift = await prisma.shift.findFirst({
            where: { id: validatedData.shiftId, organizationId: ctx.organizationId }
        })

        if (!shift) {
            return apiError("Shift not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const assignment = await prisma.shiftAssignment.create({
            data: {
                ...validatedData,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(assignment, { message: "Shift assigned successfully" }, 201)
    } catch (error: any) {
        console.error("[SHIFT_ASSIGN_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
