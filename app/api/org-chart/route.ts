/**
 * /api/org-chart — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request, _context: AuthContext) {
    return proxyToDjango(req, "/teams/org-chart/")
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
