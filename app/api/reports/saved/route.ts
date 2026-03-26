/**
 * /api/reports/saved — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/reports/saved GET", "Django /api/v1/reports/saved/")
    return proxyToDjango(req, "/reports/saved/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/reports/saved POST", "Django /api/v1/reports/saved/")
    return proxyToDjango(req, "/reports/saved/")
}

async function handleDELETE(req: Request) {
    deprecatedRoute("/api/reports/saved DELETE", "Django /api/v1/reports/saved/")
    return proxyToDjango(req, "/reports/saved/")
}

export const GET = withAuth({ module: Module.REPORTS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.REPORTS, action: Action.CREATE }, handlePOST)
export const DELETE = withAuth({ module: Module.REPORTS, action: Action.DELETE }, handleDELETE)
