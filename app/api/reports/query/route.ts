/**
 * /api/reports/query — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/reports/query GET", "Django /api/v1/reports/query/")
    return proxyToDjango(req, "/reports/query/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/reports/query POST", "Django /api/v1/reports/query/")
    return proxyToDjango(req, "/reports/query/")
}
