/**
 * /api/workflows/fields — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/workflows/fields GET", "Django /api/v1/workflows/fields/")
    return proxyToDjango(req, "/workflows/fields/")
}
