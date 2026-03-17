/**
 * /api/agent/activity — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/agent/activity GET", "Django /api/v1/agent/activity/")
    return proxyToDjango(req, "/agent/activity/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/agent/activity POST", "Django /api/v1/agent/activity/")
    return proxyToDjango(req, "/agent/activity/")
}
