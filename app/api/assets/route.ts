/**
 * /api/assets — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/assets GET", "Django /api/v1/assets/")
    return proxyToDjango(req, "/assets/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/assets POST", "Django /api/v1/assets/")
    return proxyToDjango(req, "/assets/")
}

export const GET = withAuth({ module: Module.ASSETS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.ASSETS, action: Action.CREATE }, handlePOST)
