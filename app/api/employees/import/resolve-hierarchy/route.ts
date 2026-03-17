/**
 * /api/employees/import/resolve-hierarchy — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/employees/import/resolve-hierarchy POST", "Django /api/v1/employees/import/resolve-hierarchy/")
    return proxyToDjango(req, "/employees/import/resolve-hierarchy/")
}
