/**
 * /api/performance/appraisals/eligibility — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/appraisals/eligibility GET", "Django /api/v1/performance/appraisals/eligibility/")
    return proxyToDjango(req, "/performance/appraisals/eligibility/")
}
