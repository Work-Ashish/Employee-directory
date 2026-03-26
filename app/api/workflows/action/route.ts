/**
 * /api/workflows/action — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/workflows/action POST", "Django /api/v1/workflows/action/")
    return proxyToDjango(req, "/workflows/action/")
}

export const POST = withAuth({ module: Module.WORKFLOWS, action: Action.UPDATE }, handlePOST)
