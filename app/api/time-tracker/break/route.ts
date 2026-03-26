/**
 * /api/time-tracker/break — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/time-tracker/break POST", "Django /api/v1/time-tracker/break/")
    return proxyToDjango(req, "/time-tracker/break/")
}
