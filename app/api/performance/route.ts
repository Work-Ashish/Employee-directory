/**
 * /api/performance — Django proxy (Sprint 13).
 * Maps to /api/v1/performance/reviews/ (review list + create).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/performance GET", "Django /api/v1/performance/reviews/")
    return proxyToDjango(req, "/performance/reviews/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/performance POST", "Django /api/v1/performance/reviews/")
    return proxyToDjango(req, "/performance/reviews/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
