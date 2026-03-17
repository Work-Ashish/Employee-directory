/**
 * /api/employee/documents — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/employee/documents GET", "Django /api/v1/documents/my/")
    return proxyToDjango(req, "/documents/my/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/employee/documents POST", "Django /api/v1/documents/my/")
    return proxyToDjango(req, "/documents/my/")
}
