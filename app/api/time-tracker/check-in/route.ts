/**
 * /api/time-tracker/check-in — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/time-tracker/check-in POST", "Django /api/v1/time-tracker/check-in/")
    return proxyToDjango(req, "/time-tracker/check-in/")
}

export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, handlePOST)
