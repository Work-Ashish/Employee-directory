/**
 * /api/integrations/export — Django proxy (Sprint 13).
 *
 * Called by the admin integrations page to export accounting data.
 * NOTE: Django endpoint /api/v1/integrations/export/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(_req: Request, _context: AuthContext) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, handleGET)
