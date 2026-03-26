/**
 * /api/time-tracker/check-out — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/time-tracker/check-out POST", "Django /api/v1/time-tracker/check-out/")
    return proxyToDjango(req, "/time-tracker/check-out/")
}
