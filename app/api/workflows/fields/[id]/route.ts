import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { workflowFieldConfigUpdateSchema } from "@/lib/schemas/workflow"

/**
 * GET /api/workflows/fields/:id
 */
export const GET = withAuth({ module: Module.WORKFLOWS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const id = ctx.params.id

        const field = await prisma.workflowFieldConfig.findFirst({
            where: { id, ...orgFilter(ctx) },
        })

        if (!field) {
            return apiError("Field config not found", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess(field)
    } catch (error) {
        console.error("[WORKFLOW_FIELD_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

/**
 * PUT /api/workflows/fields/:id
 * Update field config. Bumps version on each update for rollback support.
 */
export const PUT = withAuth({ module: Module.WORKFLOWS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const id = ctx.params.id
        const body = await req.json()

        const parsed = workflowFieldConfigUpdateSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.issues)
        }

        const existing = await prisma.workflowFieldConfig.findFirst({
            where: { id, ...orgFilter(ctx) },
        })
        if (!existing) {
            return apiError("Field config not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const data = parsed.data
        const updateData: Record<string, unknown> = { version: existing.version + 1 }
        if (data.fieldType !== undefined) updateData.fieldType = data.fieldType
        if (data.label !== undefined) updateData.label = data.label
        if (data.placeholder !== undefined) updateData.placeholder = data.placeholder
        if (data.required !== undefined) updateData.required = data.required
        if (data.validationRules !== undefined) updateData.validationRules = data.validationRules
        if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder
        if (data.conditionalLogic !== undefined) updateData.conditionalLogic = data.conditionalLogic
        if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue
        if (data.options !== undefined) updateData.options = data.options

        const updated = await prisma.workflowFieldConfig.update({
            where: { id },
            data: updateData as any,
        })

        return apiSuccess(updated)
    } catch (error) {
        console.error("[WORKFLOW_FIELD_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

/**
 * DELETE /api/workflows/fields/:id
 * Soft-delete (set isActive=false) by default. Use ?hard=true for permanent deletion.
 */
export const DELETE = withAuth({ module: Module.WORKFLOWS, action: Action.DELETE }, async (req, ctx) => {
    try {
        const id = ctx.params.id
        const { searchParams } = new URL(req.url)
        const hard = searchParams.get("hard") === "true"

        const existing = await prisma.workflowFieldConfig.findFirst({
            where: { id, ...orgFilter(ctx) },
        })
        if (!existing) {
            return apiError("Field config not found", ApiErrorCode.NOT_FOUND, 404)
        }

        if (hard) {
            await prisma.workflowFieldConfig.delete({ where: { id } })
            return apiSuccess({ deleted: true, id })
        }

        const updated = await prisma.workflowFieldConfig.update({
            where: { id },
            data: { isActive: false },
        })

        return apiSuccess(updated)
    } catch (error) {
        console.error("[WORKFLOW_FIELD_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
