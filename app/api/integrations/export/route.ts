/**
 * /api/integrations/export — Django proxy (Sprint 13).
 *
 * Called by the admin integrations page to export accounting data.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/integrations/export GET", "Django /api/v1/integrations/export/")
    return proxyToDjango(req, "/integrations/export/")
}
