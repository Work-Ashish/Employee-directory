/**
 * /api/reimbursements — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/reimbursements GET", "Django /api/v1/reimbursements/")
    return proxyToDjango(req, "/reimbursements/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/reimbursements POST", "Django /api/v1/reimbursements/")
    return proxyToDjango(req, "/reimbursements/")
}

export const GET = withAuth({ module: Module.REIMBURSEMENT, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.REIMBURSEMENT, action: Action.CREATE }, handlePOST)
