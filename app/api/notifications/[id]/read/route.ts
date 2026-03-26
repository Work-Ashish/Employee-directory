/**
 * /api/notifications/[id]/read — Django proxy.
 *
 * Marks a single notification as read by proxying to
 * Django PUT /api/v1/notifications/<uuid>/read/
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePUT(
    req: Request,
    context: AuthContext
) {
    const { id } = context.params
    deprecatedRoute(
        `/api/notifications/${id}/read PUT`,
        `Django /api/v1/notifications/${id}/read/`
    )
    return proxyToDjango(req, `/notifications/${id}/read/`)
}

export const PUT = withAuth({ module: Module.DASHBOARD, action: Action.UPDATE }, handlePUT)
