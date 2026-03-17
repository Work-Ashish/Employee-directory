/**
 * /api/cron/agent-aggregate — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/cron/agent-aggregate POST", "Django /api/v1/cron/agent-aggregate/")
    return proxyToDjango(req, "/cron/agent-aggregate/")
}
