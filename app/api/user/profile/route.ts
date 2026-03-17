/**
 * /api/user/profile — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/user/profile GET", "Django /api/v1/auth/me/")
    return proxyToDjango(req, "/auth/me/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/user/profile PUT", "Django /api/v1/auth/me/")
    return proxyToDjango(req, "/auth/me/")
}
