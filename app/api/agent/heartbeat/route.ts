/**
 * /api/agent/heartbeat — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/agent/heartbeat POST", "Django /api/v1/agent/heartbeat/")
    return proxyToDjango(req, "/agent/heartbeat/")
}

export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.UPDATE }, handlePOST)
