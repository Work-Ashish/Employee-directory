/**
 * /api/announcements — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/announcements GET", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/announcements POST", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/announcements PUT", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}

export async function DELETE(req: Request) {
    deprecatedRoute("/api/announcements DELETE", "Django /api/v1/announcements/")
    return proxyToDjango(req, "/announcements/")
}
