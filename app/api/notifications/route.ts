/**
 * /api/notifications — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/notifications GET", "Django /api/v1/notifications/")
    return proxyToDjango(req, "/notifications/")
}

async function handlePATCH(req: Request) {
    deprecatedRoute("/api/notifications PATCH", "Django /api/v1/notifications/")
    return proxyToDjango(req, "/notifications/")
}

export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handleGET)
export const PATCH = withAuth({ module: Module.DASHBOARD, action: Action.UPDATE }, handlePATCH)
