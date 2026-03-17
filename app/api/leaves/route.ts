/**
 * /api/leaves — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/leaves GET", "Django /api/v1/leaves/")
    return proxyToDjango(req, "/leaves/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/leaves POST", "Django /api/v1/leaves/")
    return proxyToDjango(req, "/leaves/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/leaves PUT", "Django /api/v1/leaves/")
    return proxyToDjango(req, "/leaves/")
}
