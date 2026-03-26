/**
 * /api/scim/v2/Users/[id] — Django proxy (Sprint 14).
 * SCIM endpoint handles its own auth via Bearer token.
 *
 * NOTE: Django endpoint /api/v1/scim/v2/Users/{id}/ does not exist yet.
 */
import { NextResponse } from "next/server"

function validateScimToken(req: Request): NextResponse | null {
    const scimToken = process.env.SCIM_TOKEN
    const authHeader = req.headers.get("authorization")
    if (!scimToken || authHeader !== `Bearer ${scimToken}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return null
}

export async function GET(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PUT(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PATCH(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function DELETE(req: Request) {
    const denied = validateScimToken(req)
    if (denied) return denied
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
