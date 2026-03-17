/**
 * /api/attendance/holidays — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/attendance/holidays GET", "Django /api/v1/attendance/holidays/")
    return proxyToDjango(req, "/attendance/holidays/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance/holidays POST", "Django /api/v1/attendance/holidays/")
    return proxyToDjango(req, "/attendance/holidays/")
}
