/**
 * /api/dashboard — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export async function GET(req: Request) {
    deprecatedRoute("/api/dashboard GET", "Django /api/v1/dashboard/")
    return proxyToDjango(req, "/dashboard/")
}
