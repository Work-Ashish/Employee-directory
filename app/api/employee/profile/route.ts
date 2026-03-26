/**
 * /api/employee/profile — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/employee/profile GET", "Django /api/v1/employees/profile/")
    return proxyToDjango(req, "/employees/profile/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/employee/profile PUT", "Django /api/v1/employees/profile/")
    return proxyToDjango(req, "/employees/profile/")
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePUT)
