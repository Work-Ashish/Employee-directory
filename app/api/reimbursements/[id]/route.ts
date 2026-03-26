/**
 * /api/reimbursements/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePUT(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/reimbursements/${id} PUT`, "Django /api/v1/reimbursements/:id/")
    return proxyToDjango(req, `/reimbursements/${id}/`)
}

async function handleDELETE(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/reimbursements/${id} DELETE`, "Django /api/v1/reimbursements/:id/")
    return proxyToDjango(req, `/reimbursements/${id}/`)
}

export const PUT = withAuth({ module: Module.REIMBURSEMENT, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.REIMBURSEMENT, action: Action.DELETE }, handleDELETE)
