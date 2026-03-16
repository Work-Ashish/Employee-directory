import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { workflowFieldConfigSchema } from "@/lib/schemas/workflow"

/**
 * GET /api/workflows/fields
 * List field configs. Optional query: ?screenName=LEAVE_REQUEST&active=true
 */
export const GET = withAuth({ module: Module.WORKFLOWS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const screenName = searchParams.get("screenName")
        const active = searchParams.get("active")

        const where: any = { ...orgFilter(ctx) }
        if (screenName) where.screenName = screenName
        if (active === "true") where.isActive = true
        if (active === "false") where.isActive = false

        const fields = await prisma.workflowFieldConfig.findMany({
            where,
            orderBy: [{ screenName: "asc" }, { displayOrder: "asc" }],
        })

        // Group by screenName for convenience
        const grouped: Record<string, typeof fields> = {}
        for (const f of fields) {
            if (!grouped[f.screenName]) grouped[f.screenName] = []
            grouped[f.screenName].push(f)
        }

        return apiSuccess({ fields, grouped })
    } catch (error) {
        console.error("[WORKFLOW_FIELDS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

/**
 * POST /api/workflows/fields
 * Create a new field config (or batch create with array body)
 */
export const POST = withAuth({ module: Module.WORKFLOWS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const orgId = ctx.organizationId

        // Support batch creation
        const items = Array.isArray(body) ? body : [body]
        if (items.length === 0) {
            return apiError("No fields provided", ApiErrorCode.BAD_REQUEST, 400)
        }
        if (items.length > 50) {
            return apiError("Maximum 50 fields per request", ApiErrorCode.BAD_REQUEST, 400)
        }

        const created = []
        const errors = []

        for (let i = 0; i < items.length; i++) {
            const parsed = workflowFieldConfigSchema.safeParse(items[i])
            if (!parsed.success) {
                errors.push({ index: i, fieldName: items[i]?.fieldName, reason: parsed.error.issues.map(e => e.message).join(", ") })
                continue
            }

            const data = parsed.data

            // Check for duplicate within org
            const existing = await prisma.workflowFieldConfig.findUnique({
                where: {
                    organizationId_screenName_fieldName: {
                        organizationId: orgId,
                        screenName: data.screenName,
                        fieldName: data.fieldName,
                    },
                },
            })
            if (existing) {
                errors.push({ index: i, fieldName: data.fieldName, reason: `Field "${data.fieldName}" already exists on screen "${data.screenName}"` })
                continue
            }

            const createData: Record<string, unknown> = {
                screenName: data.screenName,
                fieldName: data.fieldName,
                fieldType: data.fieldType,
                label: data.label,
                placeholder: data.placeholder,
                required: data.required,
                displayOrder: data.displayOrder,
                defaultValue: data.defaultValue,
                organizationId: orgId,
            }
            if (data.validationRules) createData.validationRules = data.validationRules
            if (data.conditionalLogic) createData.conditionalLogic = data.conditionalLogic
            if (data.options) createData.options = data.options

            const field = await prisma.workflowFieldConfig.create({
                data: createData as any,
            })
            created.push(field)
        }

        return apiSuccess({ created, errors }, undefined, created.length > 0 ? 201 : 400)
    } catch (error) {
        console.error("[WORKFLOW_FIELDS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
