/**
 * /api/agent/register — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/agent/register POST", "Django /api/v1/agent/register/")
    return proxyToDjango(req, "/agent/register/")
}

export const POST = withAuth({ module: Module.AGENT_TRACKING, action: Action.CREATE }, handlePOST)
