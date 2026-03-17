/**
 * /api/attendance/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/attendance/${id} GET`, "Django /api/v1/attendance/:id/")
    return proxyToDjango(req, `/attendance/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/attendance/${id} PUT`, "Django /api/v1/attendance/:id/")
    return proxyToDjango(req, `/attendance/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/attendance/${id} DELETE`, "Django /api/v1/attendance/:id/")
    return proxyToDjango(req, `/attendance/${id}/`)
}
