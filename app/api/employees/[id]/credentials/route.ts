/**
 * /api/employees/[id]/credentials — Django proxy (Sprint 14).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("employees") + 1]
    deprecatedRoute(`/api/employees/${id}/credentials GET`, `Django /api/v1/employees/${id}/credentials/`)
    return proxyToDjango(req, `/employees/${id}/credentials/`)
}

export async function POST(req: Request) {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const id = segments[segments.indexOf("employees") + 1]
    deprecatedRoute(`/api/employees/${id}/credentials POST`, `Django /api/v1/employees/${id}/credentials/`)
    return proxyToDjango(req, `/employees/${id}/credentials/`)
}
