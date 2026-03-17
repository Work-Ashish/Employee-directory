/**
 * /api/departments — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/departments GET", "Django /api/v1/departments/")
    return proxyToDjango(req, "/departments/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/departments POST", "Django /api/v1/departments/")
    return proxyToDjango(req, "/departments/")
}
