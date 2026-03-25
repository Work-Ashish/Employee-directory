/**
 * /api/roles/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id} GET`, `Django /api/v1/rbac/roles/${id}/`)
    return proxyToDjango(req, `/rbac/roles/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id} PUT`, `Django /api/v1/rbac/roles/${id}/`)
    return proxyToDjango(req, `/rbac/roles/${id}/`)
}

async function handleDELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("roles") + 1]
    deprecatedRoute(`/api/roles/${id} DELETE`, `Django /api/v1/rbac/roles/${id}/`)
    return proxyToDjango(req, `/rbac/roles/${id}/`)
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.EMPLOYEES, action: Action.DELETE }, handleDELETE)
