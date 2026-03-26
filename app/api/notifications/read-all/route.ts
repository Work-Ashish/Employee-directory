/**
 * /api/notifications/read-all — Django proxy.
 *
 * Marks ALL notifications as read for the authenticated user.
 * Django endpoint: PUT /api/v1/notifications/read/
 *
 * The frontend calls /notifications/read-all/ but Django uses
 * /notifications/read/ (without the "-all" suffix), so this
 * proxy bridges the path difference.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePUT(req: Request, _context: AuthContext) {
    deprecatedRoute(
        "/api/notifications/read-all PUT",
        "Django /api/v1/notifications/read/"
    )
    return proxyToDjango(req, "/notifications/read/")
}

export const PUT = withAuth({ module: Module.DASHBOARD, action: Action.UPDATE }, handlePUT)
