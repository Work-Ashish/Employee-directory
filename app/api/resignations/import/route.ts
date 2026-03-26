/**
 * /api/resignations/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminResignationView.tsx.
 * TODO: Django endpoint /api/v1/resignations/import/ not yet implemented — add to Django apps/resignations/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/resignations/import POST", "Django /api/v1/resignations/import/")
    return proxyToDjango(req, "/resignations/import/")
}
