/**
 * /api/documents — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/documents GET", "Django /api/v1/documents/")
    return proxyToDjango(req, "/documents/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/documents POST", "Django /api/v1/documents/")
    return proxyToDjango(req, "/documents/")
}
