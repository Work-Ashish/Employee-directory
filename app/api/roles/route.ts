/**
 * /api/roles — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/roles GET", "Django /api/v1/rbac/roles/")
    return proxyToDjango(req, "/rbac/roles/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/roles POST", "Django /api/v1/rbac/roles/")
    return proxyToDjango(req, "/rbac/roles/")
}
