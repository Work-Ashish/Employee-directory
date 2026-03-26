/**
 * /api/performance/metrics — Django proxy.
 * Maps to /api/v1/performance/metrics/ (performance metrics list).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/metrics GET", "Django /api/v1/performance/metrics/")
    return proxyToDjango(req, "/performance/metrics/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
