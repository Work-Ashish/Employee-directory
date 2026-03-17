/**
 * /api/reports/export — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/reports/export GET", "Django /api/v1/reports/export/")
    return proxyToDjango(req, "/reports/export/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/reports/export POST", "Django /api/v1/reports/export/")
    return proxyToDjango(req, "/reports/export/")
}
