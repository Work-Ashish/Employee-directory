import { proxyToDjango } from "@/lib/django-proxy"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request, _context: AuthContext) {
    return proxyToDjango(req, "/teams/sync-from-hierarchy/")
}

export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, handlePOST)
