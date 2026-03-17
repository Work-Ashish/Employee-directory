/**
 * /api/training/enroll — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request) {
    deprecatedRoute("/api/training/enroll POST", "Django /api/v1/training/enroll/")
    return proxyToDjango(req, "/training/enroll/")
}
