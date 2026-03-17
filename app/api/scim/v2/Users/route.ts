/**
 * /api/scim/v2/Users — Django proxy (Sprint 14).
 * SCIM endpoint handles its own auth via Bearer token.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/scim/v2/Users GET", "Django /api/v1/scim/v2/Users/")
    return proxyToDjango(req, "/scim/v2/Users/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/scim/v2/Users POST", "Django /api/v1/scim/v2/Users/")
    return proxyToDjango(req, "/scim/v2/Users/")
}
