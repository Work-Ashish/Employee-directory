/**
 * /api/performance — Django proxy (Sprint 13).
 * Maps to /api/v1/performance/reviews/ (review list + create).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance GET", "Django /api/v1/performance/reviews/")
    return proxyToDjango(req, "/performance/reviews/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance POST", "Django /api/v1/performance/reviews/")
    return proxyToDjango(req, "/performance/reviews/")
}
