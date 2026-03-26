/**
 * /api/admin/assets/import — Django proxy (Sprint 13).
 *
 * Called by CsvImportModal on the admin assets page.
 * TODO: Django endpoint /api/v1/admin/assets/import/ not yet implemented — add to Django apps/assets/urls.py
 */
import { proxyToDjango } from "@/lib/django-proxy"
import { deprecatedRoute } from "@/lib/route-deprecation"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handlePOST(req: Request) {
    deprecatedRoute("/api/admin/assets/import POST", "Django /api/v1/admin/assets/import/")
    return proxyToDjango(req, "/admin/assets/import/")
}

export const POST = withAuth({ module: Module.ASSETS, action: Action.CREATE }, handlePOST)
