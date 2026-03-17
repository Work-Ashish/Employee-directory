/**
 * /api/attendance/shifts — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/attendance/shifts GET", "Django /api/v1/attendance/shifts/")
    return proxyToDjango(req, "/attendance/shifts/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance/shifts POST", "Django /api/v1/attendance/shifts/")
    return proxyToDjango(req, "/attendance/shifts/")
}
