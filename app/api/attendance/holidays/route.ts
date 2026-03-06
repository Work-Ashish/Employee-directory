import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { holidaySchema } from "@/lib/schemas/attendance"
import { Module, Action } from "@/lib/permissions"

// GET /api/attendance/holidays – List all holidays
export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const holidays = await prisma.holiday.findMany({
            where: { organizationId: ctx.organizationId },
            orderBy: { date: "asc" }
        })

        return apiSuccess(holidays)
    } catch (error) {
        console.error("[HOLIDAYS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/attendance/holidays – Create a new holiday
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validatedData = holidaySchema.parse(body)

        const holiday = await prisma.holiday.create({
            data: {
                ...validatedData,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(holiday, { message: "Holiday created successfully" }, 201)
    } catch (error: any) {
        console.error("[HOLIDAYS_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
