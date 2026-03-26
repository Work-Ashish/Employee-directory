/**
 * /api/onboarding/agent — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/onboarding/agent/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function POST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
