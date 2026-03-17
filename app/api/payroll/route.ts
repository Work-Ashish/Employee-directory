/**
 * /api/payroll — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/payroll GET", "Django /api/v1/payroll/")
    return proxyToDjango(req, "/payroll/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/payroll POST", "Django /api/v1/payroll/")
    return proxyToDjango(req, "/payroll/")
}
