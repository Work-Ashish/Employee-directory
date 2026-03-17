/**
 * /api/kudos — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/kudos GET", "Django /api/v1/kudos/")
    return proxyToDjango(req, "/kudos/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/kudos POST", "Django /api/v1/kudos/")
    return proxyToDjango(req, "/kudos/")
}
