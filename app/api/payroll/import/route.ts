/**
 * /api/payroll/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminPayrollView.tsx.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/payroll/import POST", "Django /api/v1/payroll/import/")
    return proxyToDjango(req, "/payroll/import/")
}

export const POST = withAuth({ module: Module.PAYROLL, action: Action.IMPORT }, handlePOST)
