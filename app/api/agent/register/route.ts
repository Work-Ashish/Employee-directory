/**
 * /api/agent/register — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/agent/register POST", "Django /api/v1/agent/register/")
    return proxyToDjango(req, "/agent/register/")
}
