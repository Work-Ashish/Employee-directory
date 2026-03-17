/**
 * /api/attendance/regularization — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/attendance/regularization GET", "Django /api/v1/attendance/regularization/")
    return proxyToDjango(req, "/attendance/regularization/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/attendance/regularization POST", "Django /api/v1/attendance/regularization/")
    return proxyToDjango(req, "/attendance/regularization/")
}
