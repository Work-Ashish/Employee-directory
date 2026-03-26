/**
 * /api/documents — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/documents GET", "Django /api/v1/documents/")
    return proxyToDjango(req, "/documents/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/documents POST", "Django /api/v1/documents/")
    return proxyToDjango(req, "/documents/")
}

export const GET = withAuth({ module: Module.DOCUMENTS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.DOCUMENTS, action: Action.CREATE }, handlePOST)
