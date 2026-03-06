import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { candidateSchema } from "@/lib/schemas"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/recruitment – List candidates (scoped)
export const GET = withAuth({ module: Module.RECRUITMENT, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const stage = searchParams.get("stage")

        const where: Record<string, any> = { organizationId: ctx.organizationId }
        if (stage) where.stage = stage

        const candidates = await prisma.candidate.findMany({
            where,
            include: { department: true },
            orderBy: { createdAt: "desc" },
            take: 200,
        })

        return apiSuccess(candidates)
    } catch (error) {
        console.error("[RECRUITMENT_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/recruitment – Add a candidate
export const POST = withAuth({ module: Module.RECRUITMENT, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = candidateSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const candidate = await prisma.candidate.create({
            data: {
                name: parsed.data.name,
                email: parsed.data.email,
                phone: parsed.data.phone,
                role: parsed.data.role,
                stage: parsed.data.stage,
                status: parsed.data.status,
                interviewDate: parsed.data.interviewDate,
                notes: parsed.data.notes,
                departmentId: parsed.data.departmentId,
                organizationId: ctx.organizationId,
            },
            include: { department: true },
        })

        return apiSuccess(candidate, undefined, 201)
    } catch (error) {
        console.error("[RECRUITMENT_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/recruitment – Update candidate stage/status
export const PUT = withAuth({ module: Module.RECRUITMENT, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        if (!body.id) return apiError("Candidate ID is required", ApiErrorCode.BAD_REQUEST, 400)

        const partialParsed = candidateSchema.partial().safeParse(body)
        if (!partialParsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, partialParsed.error.format())
        }

        const candidate = await prisma.candidate.update({
            where: { id: body.id, organizationId: ctx.organizationId },
            data: {
                stage: partialParsed.data.stage,
                status: partialParsed.data.status,
                interviewDate: partialParsed.data.interviewDate,
                notes: partialParsed.data.notes,
            },
            include: { department: true },
        })

        return apiSuccess(candidate)
    } catch (error) {
        console.error("[RECRUITMENT_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
