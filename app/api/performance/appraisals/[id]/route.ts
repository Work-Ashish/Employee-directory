/**
 * /api/performance/appraisals/[id] — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("appraisals") + 1]
    deprecatedRoute(`/api/performance/appraisals/${id} GET`, "Django /api/v1/performance/appraisals/:id/")
    return proxyToDjango(req, `/performance/appraisals/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("appraisals") + 1]
    deprecatedRoute(`/api/performance/appraisals/${id} PUT`, "Django /api/v1/performance/appraisals/:id/")
    return proxyToDjango(req, `/performance/appraisals/${id}/`)
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.PERFORMANCE, action: Action.UPDATE }, handlePUT)
