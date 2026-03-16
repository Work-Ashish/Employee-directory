import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { reindexAll } from "@/lib/search-index"

/**
 * POST /api/search/reindex
 * Bulk reindex all entities for the current organization.
 * Admin-only operation.
 */
export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.IMPORT }, async (_req, ctx) => {
    try {
        const counts = await reindexAll(ctx.organizationId)
        return apiSuccess({
            message: "Reindex completed",
            indexed: counts,
            total: counts.employees + counts.candidates + counts.documents,
        })
    } catch (error) {
        console.error("[REINDEX]", error)
        return apiError("Reindex failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
