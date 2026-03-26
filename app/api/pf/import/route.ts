/**
 * /api/pf/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminPayrollView.tsx and AdminPFView.tsx.
 * TODO: Django endpoint /api/v1/pf/import/ not yet implemented — add to Django apps/pf/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/pf/import POST", "Django /api/v1/pf/import/")
    return proxyToDjango(req, "/pf/import/")
}
