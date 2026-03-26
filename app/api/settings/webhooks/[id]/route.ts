/**
 * /api/settings/webhooks/[id] — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/webhooks/{id}/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PUT() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function DELETE() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
