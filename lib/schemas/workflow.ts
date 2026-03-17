import { z } from 'zod'

/**
 * Local enum replacing @prisma/client ApproverType.
 * Matches the Django ApproverType choices.
 */
export enum ApproverType {
    ROLE = "ROLE",
    USER = "USER",
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
    MANAGER = "MANAGER",
}

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

// ── Workflow Field Config ──

export const FIELD_TYPES = [
    "text", "number", "date", "dropdown", "multi_select",
    "file", "rich_text", "user_picker",
] as const

export const workflowFieldConfigSchema = z.object({
    screenName: z.string().min(1, "Screen name is required"),
    fieldName: z.string().min(1, "Field name is required")
        .regex(/^[a-z][a-z0-9_]*$/, "Field name must be snake_case"),
    fieldType: z.enum(FIELD_TYPES),
    label: z.string().min(1, "Label is required"),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    validationRules: z.record(z.string(), z.any()).optional(),
    displayOrder: z.number().int().min(0).default(0),
    conditionalLogic: z.record(z.string(), z.any()).optional(),
    defaultValue: z.string().optional(),
    options: z.array(z.object({
        value: z.string(),
        label: z.string(),
    })).optional(),
})

export const workflowFieldConfigUpdateSchema = workflowFieldConfigSchema.partial().omit({
    screenName: true,
    fieldName: true,
})
