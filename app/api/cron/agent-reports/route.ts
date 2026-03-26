/**
 * /api/cron/agent-reports — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/cron/agent-reports/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function POST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
