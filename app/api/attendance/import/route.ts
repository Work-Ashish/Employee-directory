/**
 * /api/attendance/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminAttendanceView.tsx.
 * TODO: Django endpoint /api/v1/attendance/import/ not yet implemented — add to Django apps/attendance/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance/import POST", "Django /api/v1/attendance/import/")
    return proxyToDjango(req, "/attendance/import/")
}
