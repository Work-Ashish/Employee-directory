/**
 * /api/roles/[id]/assign — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id}/assign POST`, `Django /api/v1/rbac/roles/${id}/assign/`)
    return proxyToDjango(req, `/rbac/roles/${id}/assign/`)
}
