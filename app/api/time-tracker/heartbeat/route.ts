/**
 * /api/time-tracker/heartbeat — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/time-tracker/heartbeat POST", "Django /api/v1/time-tracker/heartbeat/")
    return proxyToDjango(req, "/time-tracker/heartbeat/")
}
