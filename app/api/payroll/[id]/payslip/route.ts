/**
 * /api/payroll/[id]/payslip — Django proxy (Sprint 13).
 *
 * Called by AdminPayrollView.tsx via window.open().
 * Django returns the rendered HTML payslip.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request, context: AuthContext) {
    const id = context.params.id
    deprecatedRoute(`/api/payroll/${id}/payslip GET`, "Django /api/v1/payroll/:id/payslip/")
    return proxyToDjango(req, `/payroll/${id}/payslip/`)
}

export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, handleGET)
