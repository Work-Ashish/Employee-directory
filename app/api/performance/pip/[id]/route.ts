/**
 * /api/performance/pip/[id] — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/pip/${id} GET`, "Django /api/v1/performance/pip/:id/")
    return proxyToDjango(req, `/performance/pip/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/pip/${id} PUT`, "Django /api/v1/performance/pip/:id/")
    return proxyToDjango(req, `/performance/pip/${id}/`)
}
