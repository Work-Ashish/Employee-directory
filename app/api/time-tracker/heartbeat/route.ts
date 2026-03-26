/**
 * /api/time-tracker/heartbeat — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/time-tracker/heartbeat POST", "Django /api/v1/time-tracker/heartbeat/")
    return proxyToDjango(req, "/time-tracker/heartbeat/")
}

export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, handlePOST)
