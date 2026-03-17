/**
 * /api/agent/commands — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/agent/commands GET", "Django /api/v1/agent/commands/")
    return proxyToDjango(req, "/agent/commands/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/agent/commands POST", "Django /api/v1/agent/commands/")
    return proxyToDjango(req, "/agent/commands/")
}
