/**
 * /api/reimbursements — Django proxy (Sprint 13).
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"

export async function GET(req: Request) {
    deprecatedRoute("/api/reimbursements GET", "Django /api/v1/reimbursements/")
    return proxyToDjango(req, "/reimbursements/")
}

export async function POST(req: Request) {
    deprecatedRoute("/api/reimbursements POST", "Django /api/v1/reimbursements/")
    return proxyToDjango(req, "/reimbursements/")
}
