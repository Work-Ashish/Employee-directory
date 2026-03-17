/**
 * /api/payroll/[id]/payslip — Django proxy (Sprint 13).
 *
 * Called by AdminPayrollView.tsx via window.open().
 * Django returns the rendered HTML payslip.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/payroll/${id}/payslip GET`, "Django /api/v1/payroll/:id/payslip/")
    return proxyToDjango(req, `/payroll/${id}/payslip/`)
}
