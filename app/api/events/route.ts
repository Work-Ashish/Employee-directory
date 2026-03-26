/**
 * /api/events — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/events GET", "Django /api/v1/events/")
    return proxyToDjango(req, "/events/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/events POST", "Django /api/v1/events/")
    return proxyToDjango(req, "/events/")
}

async function handleDELETE(req: Request) {
    deprecatedRoute("/api/events DELETE", "Django /api/v1/events/")
    return proxyToDjango(req, "/events/")
}

export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.DASHBOARD, action: Action.CREATE }, handlePOST)
export const DELETE = withAuth({ module: Module.DASHBOARD, action: Action.DELETE }, handleDELETE)
