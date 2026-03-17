/**
 * /api/cron/agent-reports — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/cron/agent-reports POST", "Django /api/v1/cron/agent-reports/")
    return proxyToDjango(req, "/cron/agent-reports/")
}
