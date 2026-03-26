/**
 * /api/reports/export — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/reports/export GET", "Django /api/v1/reports/export/")
    return proxyToDjango(req, "/reports/export/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/reports/export POST", "Django /api/v1/reports/export/")
    return proxyToDjango(req, "/reports/export/")
}

export const GET = withAuth({ module: Module.REPORTS, action: Action.EXPORT }, handleGET)
export const POST = withAuth({ module: Module.REPORTS, action: Action.EXPORT }, handlePOST)
