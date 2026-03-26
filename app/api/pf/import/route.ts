/**
 * /api/pf/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminPayrollView.tsx and AdminPFView.tsx.
 * TODO: Django endpoint /api/v1/pf/import/ not yet implemented — add to Django apps/pf/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request, _context: AuthContext) {
    deprecatedRoute("/api/pf/import POST", "Django /api/v1/pf/import/")
    return proxyToDjango(req, "/pf/import/")
}

export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, handlePOST)
