/**
 * /api/kudos — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/kudos GET", "Django /api/v1/kudos/")
    return proxyToDjango(req, "/kudos/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/kudos POST", "Django /api/v1/kudos/")
    return proxyToDjango(req, "/kudos/")
}

export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.DASHBOARD, action: Action.CREATE }, handlePOST)
