/**
 * /api/employees/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/employees/${id} GET`, "Django /api/v1/employees/:id/")
    return proxyToDjango(req, `/employees/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/employees/${id} PUT`, "Django /api/v1/employees/:id/")
    return proxyToDjango(req, `/employees/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/employees/${id} DELETE`, "Django /api/v1/employees/:id/")
    return proxyToDjango(req, `/employees/${id}/`)
}
