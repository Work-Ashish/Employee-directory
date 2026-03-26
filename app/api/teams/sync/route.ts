import { proxyToDjango } from "@/lib/django-proxy"

export async function POST(req: Request) {
    return proxyToDjango(req, "/teams/sync-from-hierarchy/")
}
