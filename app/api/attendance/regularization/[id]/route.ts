/**
 * /api/attendance/regularization/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("regularization") + 1]
    deprecatedRoute(`/api/attendance/regularization/${id} GET`, `Django /api/v1/attendance/regularization/${id}/`)
    return proxyToDjango(req, `/attendance/regularization/${id}/`)
}

export async function PUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("regularization") + 1]
    deprecatedRoute(`/api/attendance/regularization/${id} PUT`, `Django /api/v1/attendance/regularization/${id}/`)
    return proxyToDjango(req, `/attendance/regularization/${id}/`)
}

export async function DELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("regularization") + 1]
    deprecatedRoute(`/api/attendance/regularization/${id} DELETE`, `Django /api/v1/attendance/regularization/${id}/`)
    return proxyToDjango(req, `/attendance/regularization/${id}/`)
}
