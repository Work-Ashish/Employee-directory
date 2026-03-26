/**
 * /api/time-tracker/status — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/time-tracker/status GET", "Django /api/v1/time-tracker/status/")
    return proxyToDjango(req, "/time-tracker/status/")
}
