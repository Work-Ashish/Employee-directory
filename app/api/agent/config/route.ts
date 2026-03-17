/**
 * /api/agent/config — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/agent/config GET", "Django /api/v1/agent/config/")
    return proxyToDjango(req, "/agent/config/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/agent/config PUT", "Django /api/v1/agent/config/")
    return proxyToDjango(req, "/agent/config/")
}
