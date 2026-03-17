/**
 * /api/resignations — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/resignations GET", "Django /api/v1/resignations/")
    return proxyToDjango(req, "/resignations/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/resignations POST", "Django /api/v1/resignations/")
    return proxyToDjango(req, "/resignations/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/resignations PUT", "Django /api/v1/resignations/")
    return proxyToDjango(req, "/resignations/")
}
