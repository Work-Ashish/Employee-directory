/**
 * /api/employees — Django proxy (Sprint 13).
 *
 * Previously hit Prisma directly. Now proxies to Django /api/v1/employees/.
 * The feature API client in features/employees/api/client.ts already calls
 * Django directly; this proxy exists for any remaining direct fetch() calls.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/employees GET", "Django /api/v1/employees/")
    return proxyToDjango(req, "/employees/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/employees POST", "Django /api/v1/employees/")
    return proxyToDjango(req, "/employees/")
}
