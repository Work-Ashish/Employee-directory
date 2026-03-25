/**
 * /api/leaves/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("leaves") + 1]
    deprecatedRoute(`/api/leaves/${id} GET`, "Django /api/v1/leaves/:id/")
    return proxyToDjango(req, `/leaves/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("leaves") + 1]
    deprecatedRoute(`/api/leaves/${id} PUT`, "Django /api/v1/leaves/:id/")
    return proxyToDjango(req, `/leaves/${id}/`)
}

async function handleDELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("leaves") + 1]
    deprecatedRoute(`/api/leaves/${id} DELETE`, "Django /api/v1/leaves/:id/")
    return proxyToDjango(req, `/leaves/${id}/`)
}

export const GET = withAuth({ module: Module.LEAVES, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.LEAVES, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.LEAVES, action: Action.DELETE }, handleDELETE)
