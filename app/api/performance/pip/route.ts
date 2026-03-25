/**
 * /api/performance/pip — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/pip GET", "Django /api/v1/performance/pip/")
    return proxyToDjango(req, "/performance/pip/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/performance/pip POST", "Django /api/v1/performance/pip/")
    return proxyToDjango(req, "/performance/pip/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
