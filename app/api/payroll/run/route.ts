/**
 * /api/payroll/run — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/payroll/run POST", "Django /api/v1/payroll/run/")
    return proxyToDjango(req, "/payroll/run/")
}
