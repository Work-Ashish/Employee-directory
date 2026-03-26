/**
 * /api/workflows/templates — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/workflows/templates GET", "Django /api/v1/workflows/templates/")
    return proxyToDjango(req, "/workflows/templates/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/workflows/templates POST", "Django /api/v1/workflows/templates/")
    return proxyToDjango(req, "/workflows/templates/")
}

export const GET = withAuth({ module: Module.WORKFLOWS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.WORKFLOWS, action: Action.CREATE }, handlePOST)
