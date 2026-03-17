/**
 * /api/tickets — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/tickets GET", "Django /api/v1/tickets/")
    return proxyToDjango(req, "/tickets/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/tickets POST", "Django /api/v1/tickets/")
    return proxyToDjango(req, "/tickets/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/tickets PUT", "Django /api/v1/tickets/")
    return proxyToDjango(req, "/tickets/")
}
