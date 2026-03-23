/**
 * /api/performance/metrics — Django proxy.
 * Maps to /api/v1/performance/metrics/ (performance metrics list).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/metrics GET", "Django /api/v1/performance/metrics/")
    return proxyToDjango(req, "/performance/metrics/")
}
