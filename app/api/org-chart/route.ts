/**
 * /api/org-chart — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/org-chart GET", "Django /api/v1/employees/org-chart/")
    return proxyToDjango(req, "/employees/org-chart/")
}
