/**
 * /api/payroll/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/payroll/${id} GET`, "Django /api/v1/payroll/:id/")
    return proxyToDjango(req, `/payroll/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/payroll/${id} PUT`, "Django /api/v1/payroll/:id/")
    return proxyToDjango(req, `/payroll/${id}/`)
}
