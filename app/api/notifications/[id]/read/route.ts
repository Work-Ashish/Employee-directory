/**
 * /api/notifications/[id]/read — Django proxy.
 *
 * Marks a single notification as read by proxying to
 * Django PUT /api/v1/notifications/<uuid>/read/
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    deprecatedRoute(
        `/api/notifications/${id}/read PUT`,
        `Django /api/v1/notifications/${id}/read/`
    )
    return proxyToDjango(req, `/notifications/${id}/read/`)
}
