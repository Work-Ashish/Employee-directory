/**
 * /api/admin/analytics/burnout — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/analytics/burnout GET", "Django /api/v1/employees/burnout-analytics/")
    return proxyToDjango(req, "/employees/burnout-analytics/")
}
