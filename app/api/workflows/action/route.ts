/**
 * /api/workflows/action — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/workflows/action POST", "Django /api/v1/workflows/action/")
    return proxyToDjango(req, "/workflows/action/")
}
