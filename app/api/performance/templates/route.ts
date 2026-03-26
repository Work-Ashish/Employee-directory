/**
 * /api/performance/templates — Django proxy.
 * Maps to /api/v1/performance/templates/ (template list + create).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/templates GET", "Django /api/v1/performance/templates/")
    return proxyToDjango(req, "/performance/templates/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/performance/templates POST", "Django /api/v1/performance/templates/")
    return proxyToDjango(req, "/performance/templates/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
