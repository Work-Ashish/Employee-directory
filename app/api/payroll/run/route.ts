/**
 * /api/payroll/run — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/payroll/run POST", "Django /api/v1/payroll/run/")
    return proxyToDjango(req, "/payroll/run/")
}

export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, handlePOST)
