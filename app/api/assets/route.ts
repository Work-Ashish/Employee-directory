/**
 * /api/assets — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/assets GET", "Django /api/v1/assets/")
    return proxyToDjango(req, "/assets/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/assets POST", "Django /api/v1/assets/")
    return proxyToDjango(req, "/assets/")
}
