/**
 * /api/admin/agent/devices — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/admin/agent/devices GET", "Django /api/v1/admin/agent/devices/")
    return proxyToDjango(req, "/admin/agent/devices/")
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
