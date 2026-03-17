/**
 * /api/cron/reports — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/cron/reports POST", "Django /api/v1/cron/reports/")
    return proxyToDjango(req, "/cron/reports/")
}
