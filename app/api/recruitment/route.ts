/**
 * /api/recruitment — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/recruitment GET", "Django /api/v1/employees/recruitment/")
    return proxyToDjango(req, "/employees/recruitment/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/recruitment POST", "Django /api/v1/employees/recruitment/")
    return proxyToDjango(req, "/employees/recruitment/")
}

export const GET = withAuth({ module: Module.RECRUITMENT, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.RECRUITMENT, action: Action.CREATE }, handlePOST)
