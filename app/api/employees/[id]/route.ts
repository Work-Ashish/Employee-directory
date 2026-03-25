/**
 * /api/employees/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("employees") + 1]
    deprecatedRoute(`/api/employees/${id} GET`, "Django /api/v1/employees/:id/")
    return proxyToDjango(req, `/employees/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("employees") + 1]
    deprecatedRoute(`/api/employees/${id} PUT`, "Django /api/v1/employees/:id/")
    return proxyToDjango(req, `/employees/${id}/`)
}

async function handleDELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("employees") + 1]
    deprecatedRoute(`/api/employees/${id} DELETE`, "Django /api/v1/employees/:id/")
    return proxyToDjango(req, `/employees/${id}/`)
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.EMPLOYEES, action: Action.DELETE }, handleDELETE)
