/**
 * /api/audit-logs — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/audit-logs GET", "Django /api/v1/audit-logs/")
    return proxyToDjango(req, "/audit-logs/")
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
