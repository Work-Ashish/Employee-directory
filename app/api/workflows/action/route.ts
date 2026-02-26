import { NextRequest, NextResponse } from 'next/server'
import { workflowActionSchema } from '@/lib/schemas/workflow'
import { apiError, apiSuccess } from '@/lib/api-response'
import { auth } from '@/lib/auth'
import { WorkflowEngine } from '@/lib/workflow-engine'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED', 401), { status: 401 })
        }

        const body = await req.json()
        const validated = workflowActionSchema.extend({
            instanceId: workflowActionSchema.shape.action.constructor !== undefined ? require('zod').string() : require('zod').string()
        }).safeParse(body)

        if (!validated.success) {
            return NextResponse.json(apiError('Validation Error', 'VALIDATION_ERROR', 400, validated.error), { status: 400 })
        }

        const { instanceId, action, comments } = validated.data

        // Find employee mapping
        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        })

        if (!employee) {
            return NextResponse.json(apiError('Employee profile not found', 'NOT_FOUND', 404), { status: 404 })
        }

        const result = await WorkflowEngine.processAction(instanceId, employee.id, action as any, comments)

        return NextResponse.json(apiSuccess(result), { status: 200 })
    } catch (err: any) {
        if (err.message === 'Workflow instance not found') {
            return NextResponse.json(apiError('Not Found', 'NOT_FOUND', 404), { status: 404 })
        }
        if (err.message.includes('already completed') || err.message.includes('missing')) {
            return NextResponse.json(apiError(err.message, 'BAD_REQUEST', 400), { status: 400 })
        }
        return NextResponse.json(apiError('Internal Server Error', 'INTERNAL_ERROR', 500, err), { status: 500 })
    }
}
