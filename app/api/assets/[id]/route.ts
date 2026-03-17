/**
 * /api/assets/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/assets/${id} GET`, "Django /api/v1/assets/:id/")
    return proxyToDjango(req, `/assets/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/assets/${id} PUT`, "Django /api/v1/assets/:id/")
    return proxyToDjango(req, `/assets/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/assets/${id} DELETE`, "Django /api/v1/assets/:id/")
    return proxyToDjango(req, `/assets/${id}/`)
}
