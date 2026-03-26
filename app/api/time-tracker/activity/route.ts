/**
 * /api/time-tracker/activity — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/time-tracker/activity GET", "Django /api/v1/time-tracker/activity/")
    return proxyToDjango(req, "/time-tracker/activity/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/time-tracker/activity POST", "Django /api/v1/time-tracker/activity/")
    return proxyToDjango(req, "/time-tracker/activity/")
}

export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, handlePOST)
