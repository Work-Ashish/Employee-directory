/**
 * /api/performance/cycles — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/cycles GET", "Django /api/v1/performance/cycles/")
    return proxyToDjango(req, "/performance/cycles/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/performance/cycles POST", "Django /api/v1/performance/cycles/")
    return proxyToDjango(req, "/performance/cycles/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
