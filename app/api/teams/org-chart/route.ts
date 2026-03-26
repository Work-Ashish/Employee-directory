import { proxyToDjango } from "@/lib/django-proxy"

export async function GET(req: Request) {
    return proxyToDjango(req, "/teams/org-chart/")
}
