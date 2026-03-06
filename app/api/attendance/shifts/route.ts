import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { shiftSchema } from "@/lib/schemas/attendance"
import { Module, Action } from "@/lib/permissions"

// GET /api/attendance/shifts – List all shifts
export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const shifts = await prisma.shift.findMany({
            where: { organizationId: ctx.organizationId },
            orderBy: { createdAt: "desc" }
        })

        return apiSuccess(shifts)
    } catch (error) {
        console.error("[SHIFTS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/attendance/shifts – Create a new shift
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validatedData = shiftSchema.parse(body)

        const shift = await prisma.shift.create({
            data: {
                ...validatedData,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(shift, { message: "Shift created successfully" }, 201)
    } catch (error: any) {
        console.error("[SHIFTS_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
