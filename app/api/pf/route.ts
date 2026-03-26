/**
 * /api/pf — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/pf GET", "Django /api/v1/pf/")
    return proxyToDjango(req, "/pf/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/pf POST", "Django /api/v1/pf/")
    return proxyToDjango(req, "/pf/")
}

export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, handlePOST)
