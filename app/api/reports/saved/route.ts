import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { z } from "zod"

const savedReportSchema = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    entityType: z.enum(["EMPLOYEE", "PAYROLL", "ATTENDANCE", "PERFORMANCE", "LEAVE"]),
    config: z.any() // JSON blob for columns/filters
})

// GET /api/reports/saved - List saved reports
export const GET = withAuth({ module: Module.REPORTS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const reports = await prisma.savedReport.findMany({
            where: { organizationId: ctx.organizationId },
            orderBy: { updatedAt: "desc" }
        })
        return apiSuccess(reports)
    } catch (error) {
        return apiError("Failed to fetch reports", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/reports/saved - Save a new report
export const POST = withAuth({ module: Module.REPORTS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validated = savedReportSchema.parse(body)

        const report = await prisma.savedReport.create({
            data: {
                ...validated,
                organizationId: ctx.organizationId,
                creatorId: ctx.userId
            }
        })

        return apiSuccess(report, undefined, 201)
    } catch (error: any) {
        if (error instanceof z.ZodError || error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.VALIDATION_ERROR, 400)
        }
        return apiError("Failed to save report", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
