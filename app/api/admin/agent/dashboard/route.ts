/**
 * /api/admin/agent/dashboard — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/agent/dashboard GET", "Django /api/v1/agent/admin/dashboard/")
    return proxyToDjango(req, "/agent/admin/dashboard/")
}
