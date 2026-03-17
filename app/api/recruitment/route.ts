/**
 * /api/recruitment — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/recruitment GET", "Django /api/v1/employees/recruitment/")
    return proxyToDjango(req, "/employees/recruitment/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/recruitment POST", "Django /api/v1/employees/recruitment/")
    return proxyToDjango(req, "/employees/recruitment/")
}
