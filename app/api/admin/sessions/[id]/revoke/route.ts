/**
 * /api/admin/sessions/[id]/revoke — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("sessions") + 1]
    deprecatedRoute(`/api/admin/sessions/${id}/revoke POST`, `Django /api/v1/sessions/${id}/revoke/`)
    return proxyToDjango(req, `/sessions/${id}/revoke/`)
}

export const POST = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, handlePOST)
