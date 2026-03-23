/**
 * /api/performance/config — Django proxy (Sprint 13).
 * Maps to /api/v1/performance/templates/ (template list + create).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/config GET", "Django /api/v1/performance/templates/")
    return proxyToDjango(req, "/performance/templates/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance/config POST", "Django /api/v1/performance/templates/")
    return proxyToDjango(req, "/performance/templates/")
}
