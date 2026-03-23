/**
 * /api/performance/appraisals/[id] — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/appraisals/${id} GET`, "Django /api/v1/performance/appraisals/:id/")
    return proxyToDjango(req, `/performance/appraisals/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/appraisals/${id} PUT`, "Django /api/v1/performance/appraisals/:id/")
    return proxyToDjango(req, `/performance/appraisals/${id}/`)
}
