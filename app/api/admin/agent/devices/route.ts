/**
 * /api/admin/agent/devices — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/agent/devices GET", "Django /api/v1/agent/admin/devices/")
    return proxyToDjango(req, "/agent/admin/devices/")
}
