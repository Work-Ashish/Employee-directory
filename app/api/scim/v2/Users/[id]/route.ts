/**
 * /api/scim/v2/Users/[id] — Django proxy (Sprint 14).
 * SCIM endpoint handles its own auth via Bearer token.
 *
 * NOTE: Django endpoint /api/v1/scim/v2/Users/{id}/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PUT() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PATCH() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function DELETE() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
