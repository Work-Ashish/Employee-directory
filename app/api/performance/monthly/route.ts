/**
 * /api/performance/monthly — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/monthly GET", "Django /api/v1/performance/monthly/")
    return proxyToDjango(req, "/performance/monthly/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance/monthly POST", "Django /api/v1/performance/monthly/")
    return proxyToDjango(req, "/performance/monthly/")
}
