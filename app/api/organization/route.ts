/**
 * /api/organization — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/organization GET", "Django /api/v1/organization/")
    return proxyToDjango(req, "/organization/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/organization PUT", "Django /api/v1/organization/")
    return proxyToDjango(req, "/organization/")
}
