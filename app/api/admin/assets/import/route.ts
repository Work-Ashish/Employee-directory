/**
 * /api/admin/assets/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal on the admin assets page.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/admin/assets/import POST", "Django /api/v1/admin/assets/import/")
    return proxyToDjango(req, "/admin/assets/import/")
}
