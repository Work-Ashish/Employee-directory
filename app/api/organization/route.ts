/**
 * /api/organization — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/organization GET", "Django /api/v1/organization/")
    return proxyToDjango(req, "/organization/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/organization PUT", "Django /api/v1/organization/")
    return proxyToDjango(req, "/organization/")
}

export const GET = withAuth({ module: Module.ORGANIZATION, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.ORGANIZATION, action: Action.UPDATE }, handlePUT)
