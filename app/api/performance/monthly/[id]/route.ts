/**
 * /api/performance/monthly/[id] — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/monthly/${id} GET`, "Django /api/v1/performance/monthly/:id/")
    return proxyToDjango(req, `/performance/monthly/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/monthly/${id} PUT`, "Django /api/v1/performance/monthly/:id/")
    return proxyToDjango(req, `/performance/monthly/${id}/`)
}
