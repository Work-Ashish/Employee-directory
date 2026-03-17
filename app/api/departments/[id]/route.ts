/**
 * /api/departments/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/departments/${id} GET`, "Django /api/v1/departments/:id/")
    return proxyToDjango(req, `/departments/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/departments/${id} DELETE`, "Django /api/v1/departments/:id/")
    return proxyToDjango(req, `/departments/${id}/`)
}
