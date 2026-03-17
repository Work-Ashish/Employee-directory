/**
 * /api/workflows/templates — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/workflows/templates GET", "Django /api/v1/workflows/templates/")
    return proxyToDjango(req, "/workflows/templates/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/workflows/templates POST", "Django /api/v1/workflows/templates/")
    return proxyToDjango(req, "/workflows/templates/")
}
