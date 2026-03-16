import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { searchIndex, IndexableEntity } from "@/lib/search-index"

/**
 * GET /api/search?q=john&type=EMPLOYEE&limit=20
 * Full-text search across indexed entities.
 */
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get("q")?.trim()
        const entityType = searchParams.get("type") as IndexableEntity | null
        const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50)

        if (!q || q.length < 2) {
            return apiError("Query must be at least 2 characters", ApiErrorCode.BAD_REQUEST, 400)
        }

        const validTypes: IndexableEntity[] = ["EMPLOYEE", "CANDIDATE", "DOCUMENT"]
        if (entityType && !validTypes.includes(entityType)) {
            return apiError(`Invalid type. Must be one of: ${validTypes.join(", ")}`, ApiErrorCode.BAD_REQUEST, 400)
        }

        const results = await searchIndex(
            ctx.organizationId,
            q,
            { entityType: entityType || undefined, limit }
        )

        return apiSuccess({ results, query: q, total: results.length })
    } catch (error) {
        console.error("[SEARCH]", error)
        return apiError("Search failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
