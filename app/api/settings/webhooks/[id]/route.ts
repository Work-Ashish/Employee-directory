import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { webhookUpdateSchema } from "@/lib/schemas/integrations"

export const PATCH = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const resolvedParams = await ctx.params
        const { id } = resolvedParams

        const body = await req.json()
        const validatedData = webhookUpdateSchema.parse(body)

        const webhook = await prisma.webhook.update({
            where: { id, ...orgFilter(ctx) },
            data: validatedData
        })

        return apiSuccess(webhook, { message: "Webhook updated successfully" })
    } catch (error: any) {
        console.error("[WEBHOOK_PATCH]", error)
        if (error.name === "ZodError") {
            return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

export const DELETE = withAuth({ module: Module.SETTINGS, action: Action.DELETE }, async (req, ctx) => {
    try {
        const resolvedParams = await ctx.params
        const { id } = resolvedParams

        await prisma.webhook.delete({
            where: { id, ...orgFilter(ctx) }
        })

        return apiSuccess(null, { message: "Webhook deleted successfully" })
    } catch (error) {
        console.error("[WEBHOOK_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
