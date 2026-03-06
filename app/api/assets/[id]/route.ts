import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"

// GET /api/assets/:id
export const GET = withAuth({ module: Module.ASSETS, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: { assignedTo: true },
        })

        if (!asset) {
            return apiError("Asset not found", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess(asset)
    } catch (error) {
        console.error("[ASSET_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/assets/:id
export const PUT = withAuth({ module: Module.ASSETS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()

        const existing = await prisma.asset.findUnique({ where: { id } })
        if (!existing) {
            return apiError("Asset not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const asset = await prisma.asset.update({
            where: { id },
            data: {
                name: body.name,
                type: body.type,
                serialNumber: body.serialNumber,
                status: body.status,
                purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
                value: body.value !== undefined ? parseFloat(body.value) : undefined,
                image: body.image,
                assignedToId: body.assignedToId ?? null,
                assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
            },
            include: { assignedTo: true },
        })

        return apiSuccess(asset)
    } catch (error) {
        console.error("[ASSET_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/assets/:id
export const DELETE = withAuth({ module: Module.ASSETS, action: Action.DELETE }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        const existing = await prisma.asset.findUnique({ where: { id } })
        if (!existing) {
            return apiError("Asset not found", ApiErrorCode.NOT_FOUND, 404)
        }

        await prisma.asset.delete({ where: { id } })

        return apiSuccess({ message: "Asset deleted" })
    } catch (error) {
        console.error("[ASSET_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
