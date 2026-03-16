import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { resolveEmployeeCapabilities, capabilitiesToRecord } from "@/lib/permissions-server"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

/**
 * GET /api/user/capabilities
 * Returns the resolved functional capabilities for the current user.
 * Merges inherited capabilities from the role hierarchy (max 5 levels).
 * Results are cached in Redis with a 5-minute TTL.
 */
export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (_req: Request, ctx: AuthContext) => {
    if (!ctx.employeeId) {
        return apiSuccess({ capabilities: {} })
    }

    const caps = await resolveEmployeeCapabilities(ctx.employeeId)
    return apiSuccess({ capabilities: capabilitiesToRecord(caps) })
})
