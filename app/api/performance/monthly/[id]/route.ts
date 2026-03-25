/**
 * /api/performance/monthly/[id] — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("monthly") + 1]
    deprecatedRoute(`/api/performance/monthly/${id} GET`, "Django /api/v1/performance/monthly/:id/")
    return proxyToDjango(req, `/performance/monthly/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("monthly") + 1]
    deprecatedRoute(`/api/performance/monthly/${id} PUT`, "Django /api/v1/performance/monthly/:id/")
    return proxyToDjango(req, `/performance/monthly/${id}/`)
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.PERFORMANCE, action: Action.UPDATE }, handlePUT)
