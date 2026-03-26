/**
 * /api/attendance/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminAttendanceView.tsx.
 * TODO: Django endpoint /api/v1/attendance/import/ not yet implemented — add to Django apps/attendance/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request, _context: AuthContext) {
    deprecatedRoute("/api/attendance/import POST", "Django /api/v1/attendance/import/")
    return proxyToDjango(req, "/attendance/import/")
}

export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, handlePOST)
