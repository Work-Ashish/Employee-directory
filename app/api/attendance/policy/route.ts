import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { attendancePolicySchema } from "@/lib/schemas/attendance"
import { Module, Action } from "@/lib/permissions"

// GET /api/attendance/policy – Get the organization's attendance policy
export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const policy = await prisma.attendancePolicy.findUnique({
            where: { organizationId: ctx.organizationId }
        })

        if (!policy) {
            // Return default settings if none exist
            return apiSuccess({
                lateGracePeriod: 15,
                earlyExitGrace: 15,
                otThreshold: 60,
                name: "DEFAULT"
            })
        }

        return apiSuccess(policy)
    } catch (error) {
        console.error("[POLICY_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/attendance/policy – Create or update the attendance policy
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validatedData = attendancePolicySchema.parse(body)

        const policy = await prisma.attendancePolicy.upsert({
            where: { organizationId: ctx.organizationId },
            update: validatedData,
            create: {
                ...validatedData,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(policy, { message: "Attendance policy updated" }, 200)
    } catch (error: any) {
        console.error("[POLICY_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
