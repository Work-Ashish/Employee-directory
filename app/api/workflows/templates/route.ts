import { prisma } from '@/lib/prisma'
import { workflowTemplateSchema } from '@/lib/schemas/workflow'
import { withAuth, orgFilter } from '@/lib/security'
import { Module, Action } from '@/lib/permissions'
import { apiError, apiSuccess } from '@/lib/api-response'

export const GET = withAuth({ module: Module.WORKFLOWS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const templates = await prisma.workflowTemplate.findMany({
            where: orgFilter(ctx),
            include: { steps: { orderBy: { stepOrder: 'asc' } } }
        })
        return apiSuccess(templates)
    } catch (err) {
        return apiError('Internal Server Error', 'INTERNAL_ERROR', 500)
    }
})

export const POST = withAuth({ module: Module.WORKFLOWS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validated = workflowTemplateSchema.safeParse(body)

        if (!validated.success) {
            return apiError('Validation Error', 'VALIDATION_ERROR', 400, validated.error)
        }

        const template = await prisma.workflowTemplate.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                entityType: validated.data.entityType,
                status: 'PUBLISHED',
                organizationId: ctx.organizationId,
                steps: {
                    create: validated.data.steps.map((s) => ({
                        stepOrder: s.stepOrder,
                        approverType: s.approverType,
                        role: s.role,
                        userId: s.userId,
                        slaHours: s.slaHours,
                        autoAction: s.autoAction
                    }))
                }
            },
            include: { steps: true }
        })

        return apiSuccess(template, undefined, 201)
    } catch (err) {
        return apiError('Internal Server Error', 'INTERNAL_ERROR', 500)
    }
})
