/**
 * /api/roles/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id} GET`, `Django /api/v1/rbac/roles/${id}/`)
    return proxyToDjango(req, `/rbac/roles/${id}/`)
}

export async function PUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id} PUT`, `Django /api/v1/rbac/roles/${id}/`)
    return proxyToDjango(req, `/rbac/roles/${id}/`)
}

export async function DELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id} DELETE`, `Django /api/v1/rbac/roles/${id}/`)
    return proxyToDjango(req, `/rbac/roles/${id}/`)
}
