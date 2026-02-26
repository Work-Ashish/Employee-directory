const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSLABreaches() {
    console.log('Starting Workflow SLA verification check...')
    try {
        const activeInstances = await prisma.workflowInstance.findMany({
            where: { status: 'PENDING' },
            include: { template: { include: { steps: true } }, actions: { orderBy: { createdAt: 'desc' } } }
        })

        let breachedCount = 0

        for (const instance of activeInstances) {
            const currentStepConfig = instance.template.steps.find(s => s.stepOrder === instance.currentStep)
            if (!currentStepConfig || !currentStepConfig.slaHours) continue

            let stepStartTime = instance.createdAt
            if (instance.currentStep > 1) {
                const previousActions = instance.actions.filter(a => a.stepId !== currentStepConfig.id)
                if (previousActions.length > 0) {
                    stepStartTime = previousActions[0].createdAt
                }
            }

            const deadline = new Date(stepStartTime.getTime() + currentStepConfig.slaHours * 60 * 60 * 1000)

            if (new Date() > deadline) {
                breachedCount++
                console.log(`[!] SLA Breached for WorkflowInstance ${instance.id} at sequence step ${instance.currentStep}`)

                // Fire an alert to the HR admin queue to escalate the frozen workflow
                await prisma.adminAlerts.create({
                    data: {
                        employeeId: instance.requesterId,
                        severity: 'HIGH',
                        reason: `Workflow SLA Timeout Breached: Template [${instance.template.name}] is stuck on Step ${instance.currentStep} and requires intervention.`,
                        organizationId: instance.organizationId
                    }
                })
            }
        }

        console.log(`SLA verification completed. Detected and escalated ${breachedCount} breaches.`)
    } catch (err) {
        console.error('Fatal error during SLA verification cycle:', err)
    } finally {
        await prisma.$disconnect()
    }
}

checkSLABreaches()
