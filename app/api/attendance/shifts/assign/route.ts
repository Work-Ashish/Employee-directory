/**
 * /api/attendance/shifts/assign — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/attendance/shifts/assign POST", "Django /api/v1/attendance/shifts/assign/")
    return proxyToDjango(req, "/attendance/shifts/assign/")
}

export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.ASSIGN }, handlePOST)
