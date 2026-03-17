/**
 * /api/cron/evaluate-performance — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/cron/evaluate-performance POST", "Django /api/v1/cron/evaluate-performance/")
    return proxyToDjango(req, "/cron/evaluate-performance/")
}
