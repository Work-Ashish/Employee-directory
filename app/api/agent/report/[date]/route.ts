/**
 * /api/agent/report/[date] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

function extractDate(req: Request): string {
    const url = new URL(req.url)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1]
}

async function handleGET(req: Request) {
    const date = extractDate(req)
    deprecatedRoute("/api/agent/report/[date] GET", "Django /api/v1/agent/report/{date}/")
    return proxyToDjango(req, `/agent/report/${date}/`)
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
