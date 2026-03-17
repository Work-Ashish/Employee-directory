/**
 * /api/audit-logs — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/audit-logs GET", "Django /api/v1/audit-logs/")
    return proxyToDjango(req, "/audit-logs/")
}
