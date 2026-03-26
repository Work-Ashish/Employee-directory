/**
 * /api/user/password — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/user/password POST", "Django /api/v1/auth/change-password/")
    return proxyToDjango(req, "/auth/change-password/")
}

// Any authenticated user can change their own password
export const POST = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handlePOST)
