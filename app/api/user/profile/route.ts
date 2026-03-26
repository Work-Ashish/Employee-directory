/**
 * /api/user/profile — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/user/profile GET", "Django /api/v1/auth/me/")
    return proxyToDjango(req, "/auth/me/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/user/profile PUT", "Django /api/v1/auth/me/")
    return proxyToDjango(req, "/auth/me/")
}

// Any authenticated user can view/update their own profile
export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handlePUT)
