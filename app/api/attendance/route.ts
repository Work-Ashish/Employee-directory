/**
 * /api/attendance — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/attendance GET", "Django /api/v1/attendance/")
    return proxyToDjango(req, "/attendance/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance POST", "Django /api/v1/attendance/")
    return proxyToDjango(req, "/attendance/")
}
