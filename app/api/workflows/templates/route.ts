import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { workflowTemplateSchema } from '@/lib/schemas/workflow'
import { apiError, apiSuccess } from '@/lib/api-response'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.organizationId) {
            return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED', 401), { status: 401 })
        }

        const templates = await prisma.workflowTemplate.findMany({
            where: { organizationId: session.user.organizationId },
            include: { steps: { orderBy: { stepOrder: 'asc' } } }
        })
        return NextResponse.json(apiSuccess(templates))
    } catch (err) {
        return NextResponse.json(apiError('Internal Server Error', 'INTERNAL_ERROR', 500), { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.organizationId || session.user.role !== 'ADMIN') {
            return NextResponse.json(apiError('Forbidden', 'FORBIDDEN', 403), { status: 403 })
        }

        const body = await req.json()
        const validated = workflowTemplateSchema.safeParse(body)

        if (!validated.success) {
            return NextResponse.json(apiError('Validation Error', 'VALIDATION_ERROR', 400, validated.error), { status: 400 })
        }

        const template = await prisma.workflowTemplate.create({
            data: {
                name: validated.data.name,
                description: validated.data.description,
                entityType: validated.data.entityType,
                status: 'PUBLISHED',
                organizationId: session.user.organizationId,
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

        return NextResponse.json(apiSuccess(template), { status: 201 })
    } catch (err) {
        return NextResponse.json(apiError('Internal Server Error', 'INTERNAL_ERROR', 500), { status: 500 })
    }
}
