/**
 * /api/pf — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/pf GET", "Django /api/v1/pf/")
    return proxyToDjango(req, "/pf/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/pf POST", "Django /api/v1/pf/")
    return proxyToDjango(req, "/pf/")
}
