import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { webhookSchema } from "@/lib/schemas/integrations"

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const webhooks = await prisma.webhook.findMany({
            where: orgFilter(ctx),
            orderBy: { createdAt: "desc" }
        })

        return apiSuccess(webhooks)
    } catch (error) {
        console.error("[WEBHOOKS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

export const POST = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validatedData = webhookSchema.parse(body)

        const webhook = await prisma.webhook.create({
            data: {
                ...validatedData,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(webhook, { message: "Webhook created successfully" }, 201)
    } catch (error: any) {
        console.error("[WEBHOOKS_POST]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
