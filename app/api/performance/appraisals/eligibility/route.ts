/**
 * /api/performance/appraisals/eligibility — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance/appraisals/eligibility GET", "Django /api/v1/performance/appraisals/eligibility/")
    return proxyToDjango(req, "/performance/appraisals/eligibility/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
