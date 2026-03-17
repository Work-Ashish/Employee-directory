/**
 * /api/admin/performance — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/performance GET", "Django /api/v1/performance/admin/")
    return proxyToDjango(req, "/performance/admin/")
}
