/**
 * /api/admin/analytics/burnout — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/employees/burnout-analytics/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
