/**
 * /api/workflows/fields — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/workflows/fields GET", "Django /api/v1/workflows/fields/")
    return proxyToDjango(req, "/workflows/fields/")
}

export const GET = withAuth({ module: Module.WORKFLOWS, action: Action.VIEW }, handleGET)
