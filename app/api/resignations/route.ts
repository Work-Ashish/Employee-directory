/**
 * /api/resignations — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/resignations GET", "Django /api/v1/resignations/")
    return proxyToDjango(req, "/resignations/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/resignations POST", "Django /api/v1/resignations/")
    return proxyToDjango(req, "/resignations/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/resignations PUT", "Django /api/v1/resignations/")
    return proxyToDjango(req, "/resignations/")
}

export const GET = withAuth({ module: Module.RESIGNATION, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.RESIGNATION, action: Action.CREATE }, handlePOST)
export const PUT = withAuth({ module: Module.RESIGNATION, action: Action.UPDATE }, handlePUT)
