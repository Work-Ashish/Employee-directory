/**
 * /api/training/enroll — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/training/enroll POST", "Django /api/v1/training/enroll/")
    return proxyToDjango(req, "/training/enroll/")
}

export const POST = withAuth({ module: Module.TRAINING, action: Action.CREATE }, handlePOST)
