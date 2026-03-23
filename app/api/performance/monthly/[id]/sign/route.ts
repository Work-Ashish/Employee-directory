/**
 * /api/performance/monthly/[id]/sign — Django proxy.
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/performance/monthly/${id}/sign POST`, "Django /api/v1/performance/monthly/:id/sign/")
    return proxyToDjango(req, `/performance/monthly/${id}/sign/`)
}
