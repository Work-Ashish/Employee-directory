/**
 * /api/agent/idle-event — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/agent/idle-event POST", "Django /api/v1/agent/idle-event/")
    return proxyToDjango(req, "/agent/idle-event/")
}
