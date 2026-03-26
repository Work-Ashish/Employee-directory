/**
 * /api/assets/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request, context: AuthContext) {
    const { id } = context.params
    deprecatedRoute(`/api/assets/${id} GET`, "Django /api/v1/assets/:id/")
    return proxyToDjango(req, `/assets/${id}/`)
}

async function handlePUT(req: Request, context: AuthContext) {
    const { id } = context.params
    deprecatedRoute(`/api/assets/${id} PUT`, "Django /api/v1/assets/:id/")
    return proxyToDjango(req, `/assets/${id}/`)
}

async function handleDELETE(req: Request, context: AuthContext) {
    const { id } = context.params
    deprecatedRoute(`/api/assets/${id} DELETE`, "Django /api/v1/assets/:id/")
    return proxyToDjango(req, `/assets/${id}/`)
}

export const GET = withAuth({ module: Module.ASSETS, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.ASSETS, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.ASSETS, action: Action.DELETE }, handleDELETE)
