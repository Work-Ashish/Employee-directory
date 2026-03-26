/**
 * /api/tickets — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/tickets GET", "Django /api/v1/tickets/")
    return proxyToDjango(req, "/tickets/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/tickets POST", "Django /api/v1/tickets/")
    return proxyToDjango(req, "/tickets/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/tickets PUT", "Django /api/v1/tickets/")
    return proxyToDjango(req, "/tickets/")
}

export const GET = withAuth({ module: Module.TICKETS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.TICKETS, action: Action.CREATE }, handlePOST)
export const PUT = withAuth({ module: Module.TICKETS, action: Action.UPDATE }, handlePUT)
