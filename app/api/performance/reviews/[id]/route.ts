/**
 * /api/performance/reviews/[id] — Django proxy.
 * Maps to /api/v1/performance/reviews/:id/ (review detail + update).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/reviews/${id} GET`, "Django /api/v1/performance/reviews/:id/")
    return proxyToDjango(req, `/performance/reviews/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/reviews/${id} PUT`, "Django /api/v1/performance/reviews/:id/")
    return proxyToDjango(req, `/performance/reviews/${id}/`)
}
