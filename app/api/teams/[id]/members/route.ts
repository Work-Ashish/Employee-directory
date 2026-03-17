/**
 * /api/teams/[id]/members — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/teams/${id}/members GET`, "Django /api/v1/teams/:id/members/")
    return proxyToDjango(req, `/teams/${id}/members/`)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/teams/${id}/members POST`, "Django /api/v1/teams/:id/members/")
    return proxyToDjango(req, `/teams/${id}/members/`)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    deprecatedRoute(`/api/teams/${id}/members DELETE`, "Django /api/v1/teams/:id/members/")
    return proxyToDjango(req, `/teams/${id}/members/`)
}
