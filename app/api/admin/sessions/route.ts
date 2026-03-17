/**
 * /api/admin/sessions — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/sessions GET", "Django /api/v1/sessions/")
    return proxyToDjango(req, "/sessions/")
}
