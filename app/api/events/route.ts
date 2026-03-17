/**
 * /api/events — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/events GET", "Django /api/v1/events/")
    return proxyToDjango(req, "/events/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/events POST", "Django /api/v1/events/")
    return proxyToDjango(req, "/events/")
}

export async function DELETE(req: Request) {
    deprecatedRoute("/api/events DELETE", "Django /api/v1/events/")
    return proxyToDjango(req, "/events/")
}
