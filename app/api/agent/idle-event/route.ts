/**
 * /api/agent/idle-event — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/agent/idle-event POST", "Django /api/v1/agent/idle-event/")
    return proxyToDjango(req, "/agent/idle-event/")
}

export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.CREATE }, handlePOST)
