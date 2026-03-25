/**
 * /api/teams/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("teams") + 1]
    deprecatedRoute(`/api/teams/${id} GET`, "Django /api/v1/teams/:id/")
    return proxyToDjango(req, `/teams/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("teams") + 1]
    deprecatedRoute(`/api/teams/${id} PUT`, "Django /api/v1/teams/:id/")
    return proxyToDjango(req, `/teams/${id}/`)
}

async function handleDELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("teams") + 1]
    deprecatedRoute(`/api/teams/${id} DELETE`, "Django /api/v1/teams/:id/")
    return proxyToDjango(req, `/teams/${id}/`)
}

export const GET = withAuth({ module: Module.TEAMS, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.TEAMS, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.TEAMS, action: Action.DELETE }, handleDELETE)
