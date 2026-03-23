/**
 * /api/performance/pip — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/performance/pip GET", "Django /api/v1/performance/pip/")
    return proxyToDjango(req, "/performance/pip/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/performance/pip POST", "Django /api/v1/performance/pip/")
    return proxyToDjango(req, "/performance/pip/")
}
