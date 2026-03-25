/**
 * /api/roles — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/roles GET", "Django /api/v1/rbac/roles/")
    return proxyToDjango(req, "/rbac/roles/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/roles POST", "Django /api/v1/rbac/roles/")
    return proxyToDjango(req, "/rbac/roles/")
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.CREATE }, handlePOST)
