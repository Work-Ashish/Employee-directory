/**
 * /api/performance/monthly/[id]/sign — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("monthly") + 1]
    deprecatedRoute(`/api/performance/monthly/${id}/sign POST`, "Django /api/v1/performance/monthly/:id/sign/")
    return proxyToDjango(req, `/performance/monthly/${id}/sign/`)
}

export const POST = withAuth({ module: Module.PERFORMANCE, action: Action.CREATE }, handlePOST)
