import { proxyToDjango } from "@/lib/django-proxy"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    return proxyToDjango(req, "/employees/relink-users/")
}

export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePOST)
