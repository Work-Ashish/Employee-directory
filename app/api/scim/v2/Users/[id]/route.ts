/**
 * /api/scim/v2/Users/[id] — Django proxy (Sprint 14).
 * SCIM endpoint handles its own auth via Bearer token.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

function extractId(req: Request): string {
    const url = new URL(req.url)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1]
}

export async function GET(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/scim/v2/Users/[id] GET", "Django /api/v1/scim/v2/Users/{id}/")
    return proxyToDjango(req, `/scim/v2/Users/${id}/`)
}

export async function PUT(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/scim/v2/Users/[id] PUT", "Django /api/v1/scim/v2/Users/{id}/")
    return proxyToDjango(req, `/scim/v2/Users/${id}/`)
}

export async function PATCH(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/scim/v2/Users/[id] PATCH", "Django /api/v1/scim/v2/Users/{id}/")
    return proxyToDjango(req, `/scim/v2/Users/${id}/`)
}

export async function DELETE(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/scim/v2/Users/[id] DELETE", "Django /api/v1/scim/v2/Users/{id}/")
    return proxyToDjango(req, `/scim/v2/Users/${id}/`)
}
