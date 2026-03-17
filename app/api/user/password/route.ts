/**
 * /api/user/password — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/user/password POST", "Django /api/v1/auth/change-password/")
    return proxyToDjango(req, "/auth/change-password/")
}
