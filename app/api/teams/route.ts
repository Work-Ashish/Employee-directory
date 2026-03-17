/**
 * /api/teams — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/teams GET", "Django /api/v1/teams/")
    return proxyToDjango(req, "/teams/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/teams POST", "Django /api/v1/teams/")
    return proxyToDjango(req, "/teams/")
}
