/**
 * /api/documents/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/documents/${id} GET`, "Django /api/v1/documents/:id/")
    return proxyToDjango(req, `/documents/${id}/`)
}

async function handleDELETE(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/documents/${id} DELETE`, "Django /api/v1/documents/:id/")
    return proxyToDjango(req, `/documents/${id}/`)
}

export const GET = withAuth({ module: Module.DOCUMENTS, action: Action.VIEW }, handleGET)
export const DELETE = withAuth({ module: Module.DOCUMENTS, action: Action.DELETE }, handleDELETE)
