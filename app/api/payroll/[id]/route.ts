/**
 * /api/payroll/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("payroll") + 1]
    deprecatedRoute(`/api/payroll/${id} GET`, "Django /api/v1/payroll/:id/")
    return proxyToDjango(req, `/payroll/${id}/`)
}

async function handlePUT(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("payroll") + 1]
    deprecatedRoute(`/api/payroll/${id} PUT`, "Django /api/v1/payroll/:id/")
    return proxyToDjango(req, `/payroll/${id}/`)
}

export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.PAYROLL, action: Action.UPDATE }, handlePUT)
