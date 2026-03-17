/**
 * /api/reports/saved — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/reports/saved GET", "Django /api/v1/reports/saved/")
    return proxyToDjango(req, "/reports/saved/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/reports/saved POST", "Django /api/v1/reports/saved/")
    return proxyToDjango(req, "/reports/saved/")
}

export async function DELETE(req: Request) {
    deprecatedRoute("/api/reports/saved DELETE", "Django /api/v1/reports/saved/")
    return proxyToDjango(req, "/reports/saved/")
}
