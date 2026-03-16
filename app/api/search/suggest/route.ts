import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { searchIndex, IndexableEntity } from "@/lib/search-index"

/**
 * GET /api/search/suggest?q=john&type=EMPLOYEE&limit=10
 * Fast autocomplete suggestions — optimized for <100ms response.
 * Returns lightweight results: { entityType, entityId, title, subtitle, metadata }
 */
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get("q")?.trim()
        const entityType = searchParams.get("type") as IndexableEntity | null
        const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 20)

        if (!q || q.length < 1) {
            return apiSuccess({ suggestions: [] })
        }

        const validTypes: IndexableEntity[] = ["EMPLOYEE", "CANDIDATE", "DOCUMENT"]
        if (entityType && !validTypes.includes(entityType)) {
            return apiSuccess({ suggestions: [] })
        }

        const results = await searchIndex(
            ctx.organizationId,
            q,
            { entityType: entityType || undefined, limit }
        )

        // Return lightweight suggestion format
        const suggestions = results.map(r => ({
            entityType: r.entityType,
            entityId: r.entityId,
            title: r.title,
            subtitle: r.subtitle,
            metadata: r.metadata,
        }))

        return apiSuccess({ suggestions, query: q })
    } catch (error) {
        console.error("[SEARCH_SUGGEST]", error)
        return apiError("Suggestion failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
