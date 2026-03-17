/**
 * /api/teams/[id] — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/teams/${id} GET`, "Django /api/v1/teams/:id/")
    return proxyToDjango(req, `/teams/${id}/`)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/teams/${id} PUT`, "Django /api/v1/teams/:id/")
    return proxyToDjango(req, `/teams/${id}/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/teams/${id} DELETE`, "Django /api/v1/teams/:id/")
    return proxyToDjango(req, `/teams/${id}/`)
}
