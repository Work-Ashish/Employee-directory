/**
 * /api/attendance/shifts/assign — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance/shifts/assign POST", "Django /api/v1/attendance/shifts/assign/")
    return proxyToDjango(req, "/attendance/shifts/assign/")
}
