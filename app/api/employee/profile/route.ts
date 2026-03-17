/**
 * /api/employee/profile — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/employee/profile GET", "Django /api/v1/employees/profile/")
    return proxyToDjango(req, "/employees/profile/")
}

export async function PUT(req: Request) {
    deprecatedRoute("/api/employee/profile PUT", "Django /api/v1/employees/profile/")
    return proxyToDjango(req, "/employees/profile/")
}
