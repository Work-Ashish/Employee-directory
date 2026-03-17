/**
 * /api/employee/performance — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/employee/performance GET", "Django /api/v1/performance/my/")
    return proxyToDjango(req, "/performance/my/")
}
