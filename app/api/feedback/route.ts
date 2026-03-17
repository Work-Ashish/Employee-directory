/**
 * /api/feedback — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/feedback GET", "Django /api/v1/feedback/")
    return proxyToDjango(req, "/feedback/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/feedback POST", "Django /api/v1/feedback/")
    return proxyToDjango(req, "/feedback/")
}
