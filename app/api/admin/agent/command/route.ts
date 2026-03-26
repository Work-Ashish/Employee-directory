/**
 * /api/admin/agent/command — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/admin/agent/command GET", "Django /api/v1/admin/agent/command/")
    return proxyToDjango(req, "/admin/agent/command/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/admin/agent/command POST", "Django /api/v1/admin/agent/command/")
    return proxyToDjango(req, "/admin/agent/command/")
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.CREATE }, handlePOST)
