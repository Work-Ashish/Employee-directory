/**
 * /api/teams/[id]/members — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("teams") + 1]
    deprecatedRoute(`/api/teams/${id}/members GET`, "Django /api/v1/teams/:id/members/")
    return proxyToDjango(req, `/teams/${id}/members/`)
}

async function handlePOST(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("teams") + 1]
    deprecatedRoute(`/api/teams/${id}/members POST`, "Django /api/v1/teams/:id/members/")
    return proxyToDjango(req, `/teams/${id}/members/`)
}

async function handleDELETE(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("teams") + 1]
    deprecatedRoute(`/api/teams/${id}/members DELETE`, "Django /api/v1/teams/:id/members/")
    return proxyToDjango(req, `/teams/${id}/members/`)
}

export const GET = withAuth({ module: Module.TEAMS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.TEAMS, action: Action.CREATE }, handlePOST)
export const DELETE = withAuth({ module: Module.TEAMS, action: Action.DELETE }, handleDELETE)
