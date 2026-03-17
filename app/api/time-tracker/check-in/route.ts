/**
 * /api/time-tracker/check-in — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/time-tracker/check-in POST", "Django /api/v1/timetracker/check-in/")
    return proxyToDjango(req, "/timetracker/check-in/")
}
