/**
 * /api/performance/appraisals — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/appraisals GET", "Django /api/v1/performance/appraisals/")
    return proxyToDjango(req, "/performance/appraisals/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance/appraisals POST", "Django /api/v1/performance/appraisals/")
    return proxyToDjango(req, "/performance/appraisals/")
}
