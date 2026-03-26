/**
 * /api/feedback — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/feedback GET", "Django /api/v1/feedback/")
    return proxyToDjango(req, "/feedback/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/feedback POST", "Django /api/v1/feedback/")
    return proxyToDjango(req, "/feedback/")
}

export const GET = withAuth({ module: Module.FEEDBACK, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.FEEDBACK, action: Action.CREATE }, handlePOST)
