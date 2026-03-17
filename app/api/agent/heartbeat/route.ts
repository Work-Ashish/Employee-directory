/**
 * /api/agent/heartbeat — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/agent/heartbeat POST", "Django /api/v1/agent/heartbeat/")
    return proxyToDjango(req, "/agent/heartbeat/")
}
