/**
 * /api/agent/commands/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

function extractId(req: Request): string {
    const url = new URL(req.url)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1]
}

export async function GET(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/agent/commands/[id] GET", "Django /api/v1/agent/commands/{id}/")
    return proxyToDjango(req, `/agent/commands/${id}/`)
}

export async function PUT(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/agent/commands/[id] PUT", "Django /api/v1/agent/commands/{id}/")
    return proxyToDjango(req, `/agent/commands/${id}/`)
}
