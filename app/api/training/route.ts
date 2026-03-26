/**
 * /api/training — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(req: Request) {
    deprecatedRoute("/api/training GET", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

async function handlePOST(req: Request) {
    deprecatedRoute("/api/training POST", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

async function handlePUT(req: Request) {
    deprecatedRoute("/api/training PUT", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

async function handleDELETE(req: Request) {
    deprecatedRoute("/api/training DELETE", "Django /api/v1/training/")
    return proxyToDjango(req, "/training/")
}

export const GET = withAuth({ module: Module.TRAINING, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.TRAINING, action: Action.CREATE }, handlePOST)
export const PUT = withAuth({ module: Module.TRAINING, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.TRAINING, action: Action.DELETE }, handleDELETE)
