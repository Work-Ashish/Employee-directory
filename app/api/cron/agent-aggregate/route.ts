/**
 * /api/cron/agent-aggregate — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/cron/agent-aggregate/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function POST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
