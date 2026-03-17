/**
 * /api/payroll/config — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/payroll/config GET", "Django /api/v1/payroll/config/")
    return proxyToDjango(req, "/payroll/config/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/payroll/config POST", "Django /api/v1/payroll/config/")
    return proxyToDjango(req, "/payroll/config/")
}
