/**
 * /api/performance/templates/[id] — Django proxy.
 * Maps to /api/v1/performance/templates/:id/ (template detail + update + delete).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/performance/templates/${id} GET`, "Django /api/v1/performance/templates/:id/")
    return proxyToDjango(req, `/performance/templates/${id}/`)
}

async function handlePUT(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/performance/templates/${id} PUT`, "Django /api/v1/performance/templates/:id/")
    return proxyToDjango(req, `/performance/templates/${id}/`)
}

async function handleDELETE(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/performance/templates/${id} DELETE`, "Django /api/v1/performance/templates/:id/")
    return proxyToDjango(req, `/performance/templates/${id}/`)
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.PERFORMANCE, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.PERFORMANCE, action: Action.DELETE }, handleDELETE)
