/**
 * /api/reports/query — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/reports/query GET", "Django /api/v1/reports/query/")
    return proxyToDjango(req, "/reports/query/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/reports/query POST", "Django /api/v1/reports/query/")
    return proxyToDjango(req, "/reports/query/")
}

export const GET = withAuth({ module: Module.REPORTS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.REPORTS, action: Action.VIEW }, handlePOST)
