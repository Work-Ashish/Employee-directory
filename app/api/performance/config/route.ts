/**
 * /api/performance/config — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/config GET", "Django /api/v1/performance/config/")
    return proxyToDjango(req, "/performance/config/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/performance/config PUT", "Django /api/v1/performance/config/")
    return proxyToDjango(req, "/performance/config/")
}
