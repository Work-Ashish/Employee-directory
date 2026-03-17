/**
 * /api/admin/orphan-check — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/admin/orphan-check GET", "Django /api/v1/employees/orphan-check/")
    return proxyToDjango(req, "/employees/orphan-check/")
}
