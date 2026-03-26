/**
 * /api/admin/sessions — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/admin/sessions GET", "Django /api/v1/sessions/")
    return proxyToDjango(req, "/sessions/")
}

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, handleGET)
