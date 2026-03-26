/**
 * /api/performance/reviews/[id] — Django proxy.
 * Maps to /api/v1/performance/reviews/:id/ (review detail + update).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/performance/reviews/${id} GET`, "Django /api/v1/performance/reviews/:id/")
    return proxyToDjango(req, `/performance/reviews/${id}/`)
}

async function handlePUT(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/performance/reviews/${id} PUT`, "Django /api/v1/performance/reviews/:id/")
    return proxyToDjango(req, `/performance/reviews/${id}/`)
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.PERFORMANCE, action: Action.UPDATE }, handlePUT)
