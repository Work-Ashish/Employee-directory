/**
 * /api/roles/[id]/permissions — Django proxy.
 *
 * Proxies to Django /api/v1/rbac/roles/<uuid>/permissions/
 * Used by RoleManagement.tsx to fetch and update role permissions.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(
        `/api/roles/${id}/permissions GET`,
        `Django /api/v1/rbac/roles/${id}/permissions/`
    )
    return proxyToDjango(req, `/rbac/roles/${id}/permissions/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(
        `/api/roles/${id}/permissions PUT`,
        `Django /api/v1/rbac/roles/${id}/permissions/`
    )
    return proxyToDjango(req, `/rbac/roles/${id}/permissions/`)
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePUT)
