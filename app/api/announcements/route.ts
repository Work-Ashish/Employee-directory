/**
 * /api/announcements — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/announcements GET", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/announcements POST", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/announcements PUT", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

async function handleDELETE(req: Request) {
    deprecatedRoute("/api/announcements DELETE", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

export const GET = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.CREATE }, handlePOST)
export const PUT = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.DELETE }, handleDELETE)
