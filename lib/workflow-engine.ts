import { prisma } from '@/lib/prisma'
import { ApprovalAction } from '@prisma/client'

export class WorkflowEngine {

    // Initiate a new workflow instance
    static async initiateWorkflow(templateId: string, entityId: string, requesterId: string, organizationId: string) {
        return prisma.workflowInstance.create({
            data: {
                templateId,
                entityId,
                requesterId,
                organizationId,
                status: 'PENDING',
                currentStep: 1
            }
        })
    }

    // Process an action (Approve, Reject, etc)
    static async processAction(instanceId: string, actorId: string, action: ApprovalAction, comments?: string) {
        const instance = await prisma.workflowInstance.findUnique({
            where: { id: instanceId },
            include: { template: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } }
        })

        if (!instance) throw new Error('Workflow instance not found')
        if (instance.status !== 'PENDING') throw new Error('Workflow is already completed or rejected')

        const currentStepConfig = instance.template.steps.find((s: any) => s.stepOrder === instance.currentStep)
        if (!currentStepConfig) throw new Error('Step configuration missing')

        // Inside a real implementation, we would verify here that the actor matches
        // the required approverType (e.g. they are the manager, have the required role, etc.)

        return prisma.$transaction(async (tx: any) => {
            // Record action
            await tx.workflowAction.create({
                data: {
                    instanceId,
                    stepId: currentStepConfig.id,
                    actorId,
                    action,
                    comments
                }
            })

            if (action === 'REJECT') {
                return tx.workflowInstance.update({
                    where: { id: instanceId },
                    data: { status: 'REJECTED' }
                })
            }

            if (action === 'APPROVE') {
                const nextStepOrder = instance.currentStep + 1
                const nextStepConfig = instance.template.steps.find((s: any) => s.stepOrder === nextStepOrder)

                if (nextStepConfig) {
                    // Move to next step
                    return tx.workflowInstance.update({
                        where: { id: instanceId },
                        data: { currentStep: nextStepOrder }
                    })
                } else {
                    // Workflow completed successfully (No more steps)
                    return tx.workflowInstance.update({
                        where: { id: instanceId },
                        data: { status: 'APPROVED' }
                    })
                }
            }

            return instance
        })
    }
}
