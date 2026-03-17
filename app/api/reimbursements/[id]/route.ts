/**
 * /api/reimbursements/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/reimbursements/${id} PUT`, "Django /api/v1/reimbursements/:id/")
    return proxyToDjango(req, `/reimbursements/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/reimbursements/${id} DELETE`, "Django /api/v1/reimbursements/:id/")
    return proxyToDjango(req, `/reimbursements/${id}/`)
}
