/**
 * /api/agent/report/[date] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

function extractDate(req: Request): string {
    const url = new URL(req.url)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1]
}

export async function GET(req: Request) {
    const date = extractDate(req)
    deprecatedRoute("/api/agent/report/[date] GET", "Django /api/v1/agent/report/{date}/")
    return proxyToDjango(req, `/agent/report/${date}/`)
}
