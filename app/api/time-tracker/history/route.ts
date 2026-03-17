/**
 * /api/time-tracker/history — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/time-tracker/history GET", "Django /api/v1/timetracker/history/")
    return proxyToDjango(req, "/timetracker/history/")
}
