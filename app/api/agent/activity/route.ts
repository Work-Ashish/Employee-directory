/**
 * /api/agent/activity — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/agent/activity GET", "Django /api/v1/agent/activity/")
    return proxyToDjango(req, "/agent/activity/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/agent/activity POST", "Django /api/v1/agent/activity/")
    return proxyToDjango(req, "/agent/activity/")
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.CREATE }, handlePOST)
