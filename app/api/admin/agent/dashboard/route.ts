/**
 * /api/admin/agent/dashboard — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/admin/agent/dashboard GET", "Django /api/v1/admin/agent/dashboard/")
    return proxyToDjango(req, "/admin/agent/dashboard/")
}

export const GET = withAuth({ module: Module.AGENT_TRACKING, action: Action.VIEW }, handleGET)
