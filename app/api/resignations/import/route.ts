/**
 * /api/resignations/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminResignationView.tsx.
 * TODO: Django endpoint /api/v1/resignations/import/ not yet implemented — add to Django apps/resignations/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request, _context: AuthContext) {
    deprecatedRoute("/api/resignations/import POST", "Django /api/v1/resignations/import/")
    return proxyToDjango(req, "/resignations/import/")
}

export const POST = withAuth({ module: Module.RESIGNATION, action: Action.CREATE }, handlePOST)
