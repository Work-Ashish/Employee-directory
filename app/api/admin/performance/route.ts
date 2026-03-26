/**
 * /api/admin/performance — Django proxy (Sprint 14).
 * Maps to /api/v1/performance/reviews/ — admin users see all reviews
 * via server-side filtering in PerformanceReviewListCreateView.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/admin/performance GET", "Django /api/v1/performance/reviews/")
    return proxyToDjango(req, "/performance/reviews/")
}

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, handleGET)
