/**
 * /api/admin/time-tracker/dashboard — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/time-tracker/dashboard GET", "Django /api/v1/timetracker/dashboard/")
    return proxyToDjango(req, "/timetracker/dashboard/")
}
