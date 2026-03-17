/**
 * /api/training — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/training GET", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/training POST", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/training PUT", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

export async function DELETE(req: Request) {
    deprecatedRoute("/api/training DELETE", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}
