/**
 * /api/teams — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/teams GET", "Django /api/v1/teams/")
    return proxyToDjango(req, "/teams/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/teams POST", "Django /api/v1/teams/")
    return proxyToDjango(req, "/teams/")
}

export const GET = withAuth({ module: Module.TEAMS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.TEAMS, action: Action.CREATE }, handlePOST)
