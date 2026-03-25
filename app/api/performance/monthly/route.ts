/**
 * /api/performance/monthly — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/monthly GET", "Django /api/v1/performance/monthly/")
    return proxyToDjango(req, "/performance/monthly/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/performance/monthly POST", "Django /api/v1/performance/monthly/")
    return proxyToDjango(req, "/performance/monthly/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
