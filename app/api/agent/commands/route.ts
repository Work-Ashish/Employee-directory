/**
 * /api/agent/commands — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/agent/commands GET", "Django /api/v1/agent/commands/")
    return proxyToDjango(req, "/agent/commands/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/agent/commands POST", "Django /api/v1/agent/commands/")
    return proxyToDjango(req, "/agent/commands/")
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.CREATE }, handlePOST)
