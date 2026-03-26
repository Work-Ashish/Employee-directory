/**
 * /api/workflows/fields/[id] — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

function extractId(req: Request): string {
    const url = new URL(req.url)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1]
}

async function handleGET(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/workflows/fields/[id] GET", "Django /api/v1/workflows/fields/{id}/")
    return proxyToDjango(req, `/workflows/fields/${id}/`)
}

async function handlePUT(req: Request) {
    const id = extractId(req)
    deprecatedRoute("/api/workflows/fields/[id] PUT", "Django /api/v1/workflows/fields/{id}/")
    return proxyToDjango(req, `/workflows/fields/${id}/`)
}

export const GET = withAuth({ module: Module.WORKFLOWS, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.WORKFLOWS, action: Action.UPDATE }, handlePUT)
