/**
 * /api/admin/sessions/[id]/revoke — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("sessions") + 1]
    deprecatedRoute(`/api/admin/sessions/${id}/revoke POST`, `Django /api/v1/sessions/${id}/revoke/`)
    return proxyToDjango(req, `/sessions/${id}/revoke/`)
}
