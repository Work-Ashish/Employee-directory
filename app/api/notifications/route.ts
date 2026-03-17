/**
 * /api/notifications — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/notifications GET", "Django /api/v1/notifications/")
    return proxyToDjango(req, "/notifications/")
}

export async function PATCH(req: Request) {
    deprecatedRoute("/api/notifications PATCH", "Django /api/v1/notifications/")
    return proxyToDjango(req, "/notifications/")
}
