/**
 * /api/attendance/policy — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/attendance/policy GET", "Django /api/v1/attendance/policy/")
    return proxyToDjango(req, "/attendance/policy/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance/policy POST", "Django /api/v1/attendance/policy/")
    return proxyToDjango(req, "/attendance/policy/")
}
