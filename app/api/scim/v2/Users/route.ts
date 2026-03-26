/**
 * /api/scim/v2/Users — Django proxy (Sprint 14).
 * SCIM endpoint handles its own auth via Bearer token.
 *
 * NOTE: Django endpoint /api/v1/scim/v2/Users/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function POST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
