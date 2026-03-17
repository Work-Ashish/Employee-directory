/**
 * /api/settings/webhooks/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("webhooks") + 1]
    deprecatedRoute(`/api/settings/webhooks/${id} GET`, `Django /api/v1/webhooks/${id}/`)
    return proxyToDjango(req, `/webhooks/${id}/`)
}

export async function PUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("webhooks") + 1]
    deprecatedRoute(`/api/settings/webhooks/${id} PUT`, `Django /api/v1/webhooks/${id}/`)
    return proxyToDjango(req, `/webhooks/${id}/`)
}

export async function DELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("webhooks") + 1]
    deprecatedRoute(`/api/settings/webhooks/${id} DELETE`, `Django /api/v1/webhooks/${id}/`)
    return proxyToDjango(req, `/webhooks/${id}/`)
}
