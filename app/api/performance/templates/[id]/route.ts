/**
 * /api/performance/templates/[id] — Django proxy.
 * Maps to /api/v1/performance/templates/:id/ (template detail + update + delete).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/templates/${id} GET`, "Django /api/v1/performance/templates/:id/")
    return proxyToDjango(req, `/performance/templates/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/templates/${id} PUT`, "Django /api/v1/performance/templates/:id/")
    return proxyToDjango(req, `/performance/templates/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/templates/${id} DELETE`, "Django /api/v1/performance/templates/:id/")
    return proxyToDjango(req, `/performance/templates/${id}/`)
}
