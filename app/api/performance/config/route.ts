import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { performanceTemplateSchema } from "@/lib/schemas"
import { Module, Action } from "@/lib/permissions"

// Hardcoded defaults — single source of truth for fallback values
const DEFAULTS = {
    dailyMetrics: [
        "Tasks Completed", "Meetings Attended", "Emails/Communications",
        "Reports Prepared", "Client Interactions", "Issues Resolved",
        "Training Hours", "Collaboration Activities",
    ],
    dailyCompetencies: [
        "Communication Quality", "Responsiveness & Follow-Through",
        "Team Collaboration", "Attention to Detail",
        "Problem Solving", "Process Adherence",
    ],
    monthlyKpis: [
        "Projects/Tasks Completed", "Deadlines Met", "Quality Score",
        "Client/Stakeholder Satisfaction", "Revenue/Cost Impact",
        "Training Completed", "Attendance Rate", "Team Contribution",
        "Documentation Delivered", "Innovation Initiatives",
    ],
    monthlyCompetencies: [
        "Technical Proficiency", "Communication & Collaboration",
        "Leadership & Initiative", "Problem Solving", "Time Management",
        "Customer Focus", "Adaptability & Learning", "Quality & Detail",
        "Process Compliance", "Continuous Improvement",
    ],
    selfCompetencies: [
        "Technical Proficiency", "Communication & Collaboration",
        "Leadership & Initiative", "Problem Solving", "Time Management",
        "Customer Focus", "Adaptability & Learning", "Quality & Detail",
        "Process Compliance", "Continuous Improvement",
    ],
}

// GET /api/performance/config — fetch org template or defaults
export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const template = await prisma.performanceTemplate.findUnique({
            where: { organizationId: ctx.organizationId },
        })

        if (!template) {
            return apiSuccess(DEFAULTS)
        }

        return apiSuccess({
            dailyMetrics:        template.dailyMetrics as string[],
            dailyCompetencies:   template.dailyCompetencies as string[],
            monthlyKpis:         template.monthlyKpis as string[],
            monthlyCompetencies: template.monthlyCompetencies as string[],
            selfCompetencies:    template.selfCompetencies as string[],
        })
    } catch (error) {
        console.error("[PERF_CONFIG_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/performance/config — CEO/HR upsert org template
export const PUT = withAuth({ module: Module.PERFORMANCE, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const data = performanceTemplateSchema.parse(body)

        const template = await prisma.performanceTemplate.upsert({
            where: { organizationId: ctx.organizationId },
            update: {
                dailyMetrics:        data.dailyMetrics,
                dailyCompetencies:   data.dailyCompetencies,
                monthlyKpis:         data.monthlyKpis,
                monthlyCompetencies: data.monthlyCompetencies,
                selfCompetencies:    data.selfCompetencies,
            },
            create: {
                organizationId:      ctx.organizationId,
                dailyMetrics:        data.dailyMetrics,
                dailyCompetencies:   data.dailyCompetencies,
                monthlyKpis:         data.monthlyKpis,
                monthlyCompetencies: data.monthlyCompetencies,
                selfCompetencies:    data.selfCompetencies,
            },
        })

        return apiSuccess({
            dailyMetrics:        template.dailyMetrics as string[],
            dailyCompetencies:   template.dailyCompetencies as string[],
            monthlyKpis:         template.monthlyKpis as string[],
            monthlyCompetencies: template.monthlyCompetencies as string[],
            selfCompetencies:    template.selfCompetencies as string[],
        }, { message: "Performance template updated" })
    } catch (error: any) {
        console.error("[PERF_CONFIG_PUT]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
