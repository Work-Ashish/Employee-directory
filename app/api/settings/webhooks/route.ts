/**
 * /api/settings/webhooks — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/webhooks/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function POST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
