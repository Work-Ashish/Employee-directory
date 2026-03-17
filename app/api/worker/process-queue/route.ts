/**
 * /api/worker/process-queue — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/worker/process-queue POST", "Django /api/v1/worker/process-queue/")
    return proxyToDjango(req, "/worker/process-queue/")
}
