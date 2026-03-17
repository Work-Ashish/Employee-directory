/**
 * /api/employees/managers — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/employees/managers GET", "Django /api/v1/employees/managers/")
    return proxyToDjango(req, "/employees/managers/")
}
