/**
 * /api/performance — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance GET", "Django /api/v1/performance/")
    return proxyToDjango(req, "/performance/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance POST", "Django /api/v1/performance/")
    return proxyToDjango(req, "/performance/")
}
