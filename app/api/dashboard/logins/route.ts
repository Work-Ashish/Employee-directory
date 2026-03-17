/**
 * /api/dashboard/logins — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    deprecatedRoute("/api/dashboard/logins GET", "Django /api/v1/dashboard/logins/")
    return proxyToDjango(req, "/dashboard/logins/")
}
