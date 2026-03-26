/**
 * /api/agent/commands/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

function extractId(req: Request): string {
    const url = new URL(req.url)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1]
}

async function handleGET(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/agent/commands/[id] GET", "Django /api/v1/agent/commands/{id}/")
    return proxyToDjango(req, `/agent/commands/${id}/`)
}

async function handlePUT(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/agent/commands/[id] PUT", "Django /api/v1/agent/commands/{id}/")
    return proxyToDjango(req, `/agent/commands/${id}/`)
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.AGENT_TRACKING, action: Action.UPDATE }, handlePUT)
