/**
 * /api/performance/appraisals — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/appraisals GET", "Django /api/v1/performance/appraisals/")
    return proxyToDjango(req, "/performance/appraisals/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/performance/appraisals POST", "Django /api/v1/performance/appraisals/")
    return proxyToDjango(req, "/performance/appraisals/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
