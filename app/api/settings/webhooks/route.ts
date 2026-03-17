/**
 * /api/settings/webhooks — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/settings/webhooks GET", "Django /api/v1/webhooks/")
    return proxyToDjango(req, "/webhooks/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/settings/webhooks POST", "Django /api/v1/webhooks/")
    return proxyToDjango(req, "/webhooks/")
}
