/**
 * /api/roles/[id]/assign — stub (Sprint 14).
 *
 * Django does not expose a /rbac/roles/<id>/assign/ endpoint.
 * Role-to-user assignment is handled via PUT /api/v1/users/<user_id>/roles/.
 * This stub returns 501 so the frontend receives a clear signal.
 */
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST() {
    return Response.json(
        {
            error: "Not implemented",
            detail:
                "Role assignment is managed via PUT /api/v1/users/<user_id>/roles/. " +
                "This endpoint is not supported by the Django backend.",
        },
        { status: 501 }
    )
}

export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePOST)
