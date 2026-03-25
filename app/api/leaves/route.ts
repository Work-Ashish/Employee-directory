/**
 * /api/leaves — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/leaves GET", "Django /api/v1/leaves/")
    return proxyToDjango(req, "/leaves/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/leaves POST", "Django /api/v1/leaves/")
    return proxyToDjango(req, "/leaves/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/leaves PUT", "Django /api/v1/leaves/")
    return proxyToDjango(req, "/leaves/")
}

export const GET = withAuth({ module: Module.LEAVES, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.LEAVES, action: Action.CREATE }, handlePOST)
export const PUT = withAuth({ module: Module.LEAVES, action: Action.UPDATE }, handlePUT)
