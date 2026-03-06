import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { assetSchema } from "@/lib/schemas"
import { Module, Action } from "@/lib/permissions"

// GET /api/assets – List all assets (scoped)
export const GET = withAuth({ module: Module.ASSETS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const assets = await prisma.asset.findMany({
            where: { organizationId: ctx.organizationId },
            include: { assignedTo: true },
            orderBy: { createdAt: "desc" },
        })
        return apiSuccess(assets)
    } catch (error) {
        console.error("[ASSETS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/assets – Create a new asset
export const POST = withAuth({ module: Module.ASSETS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = assetSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const asset = await prisma.asset.create({
            data: {
                name: parsed.data.name,
                type: parsed.data.type,
                serialNumber: parsed.data.serialNumber,
                status: body.status || "AVAILABLE",
                purchaseDate: parsed.data.purchaseDate,
                value: parsed.data.value,
                image: parsed.data.image,
                assignedToId: parsed.data.assignedToId || null,
                assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
                organizationId: ctx.organizationId,
            },
            include: { assignedTo: true },
        })

        return apiSuccess(asset, undefined, 201)
    } catch (error) {
        console.error("[ASSETS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
