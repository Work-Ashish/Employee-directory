/**
 * /api/performance/cycles — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/cycles GET", "Django /api/v1/performance/cycles/")
    return proxyToDjango(req, "/performance/cycles/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance/cycles POST", "Django /api/v1/performance/cycles/")
    return proxyToDjango(req, "/performance/cycles/")
}
