import { z } from 'zod'
import { ApproverType } from '@prisma/client'

export const workflowStepSchema = z.object({
    stepOrder: z.number().int().min(1),
    approverType: z.nativeEnum(ApproverType),
    role: z.string().optional(),
    userId: z.string().optional(),
    slaHours: z.number().int().optional(),
    autoAction: z.string().optional(),
})

export const workflowTemplateSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    entityType: z.string().min(1),
    steps: z.array(workflowStepSchema).min(1),
})

export const workflowActionSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_INFO']),
    comments: z.string().optional()
})
