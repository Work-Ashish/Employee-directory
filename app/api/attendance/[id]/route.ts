/**
 * /api/attendance/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("attendance") + 1]
    deprecatedRoute(`/api/attendance/${id} GET`, "Django /api/v1/attendance/:id/")
    return proxyToDjango(req, `/attendance/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("attendance") + 1]
    deprecatedRoute(`/api/attendance/${id} PUT`, "Django /api/v1/attendance/:id/")
    return proxyToDjango(req, `/attendance/${id}/`)
}

async function handleDELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("attendance") + 1]
    deprecatedRoute(`/api/attendance/${id} DELETE`, "Django /api/v1/attendance/:id/")
    return proxyToDjango(req, `/attendance/${id}/`)
}

export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.ATTENDANCE, action: Action.DELETE }, handleDELETE)
