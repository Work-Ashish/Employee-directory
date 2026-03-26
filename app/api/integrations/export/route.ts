/**
 * /api/integrations/export — Django proxy (Sprint 13).
 *
 * Called by the admin integrations page to export accounting data.
 * NOTE: Django endpoint /api/v1/integrations/export/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
