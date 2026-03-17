/**
 * /api/pf/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal in AdminPayrollView.tsx and AdminPFView.tsx.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/pf/import POST", "Django /api/v1/pf/import/")
    return proxyToDjango(req, "/pf/import/")
}
