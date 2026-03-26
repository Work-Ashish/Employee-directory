/**
 * /api/time-tracker/check-out — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/time-tracker/check-out POST", "Django /api/v1/time-tracker/check-out/")
    return proxyToDjango(req, "/time-tracker/check-out/")
}

export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, handlePOST)
