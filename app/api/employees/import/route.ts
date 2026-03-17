/**
 * /api/employees/import — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/employees/import POST", "Django /api/v1/employees/import/")
    return proxyToDjango(req, "/employees/import/")
}
