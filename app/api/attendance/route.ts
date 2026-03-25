/**
 * /api/attendance — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/attendance GET", "Django /api/v1/attendance/")
    return proxyToDjango(req, "/attendance/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/attendance POST", "Django /api/v1/attendance/")
    return proxyToDjango(req, "/attendance/")
}

export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, handlePOST)
