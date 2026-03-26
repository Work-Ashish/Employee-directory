/**
 * /api/time-tracker/activity — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/time-tracker/activity GET", "Django /api/v1/time-tracker/activity/")
    return proxyToDjango(req, "/time-tracker/activity/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/time-tracker/activity POST", "Django /api/v1/time-tracker/activity/")
    return proxyToDjango(req, "/time-tracker/activity/")
}
