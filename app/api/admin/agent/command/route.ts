/**
 * /api/admin/agent/command — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/agent/command GET", "Django /api/v1/agent/admin/command/")
    return proxyToDjango(req, "/agent/admin/command/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/admin/agent/command POST", "Django /api/v1/agent/admin/command/")
    return proxyToDjango(req, "/agent/admin/command/")
}
