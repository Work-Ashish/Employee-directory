/**
 * /api/agent/config — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/agent/config GET", "Django /api/v1/agent/config/")
    return proxyToDjango(req, "/agent/config/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/agent/config PUT", "Django /api/v1/agent/config/")
    return proxyToDjango(req, "/agent/config/")
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.AGENT_TRACKING, action: Action.UPDATE }, handlePUT)
