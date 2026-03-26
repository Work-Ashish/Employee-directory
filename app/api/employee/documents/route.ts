/**
 * /api/employee/documents — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/employee/documents GET", "Django /api/v1/documents/my/")
    return proxyToDjango(req, "/documents/my/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/employee/documents POST", "Django /api/v1/documents/my/")
    return proxyToDjango(req, "/documents/my/")
}

export const GET = withAuth({ module: Module.DOCUMENTS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.DOCUMENTS, action: Action.CREATE }, handlePOST)
