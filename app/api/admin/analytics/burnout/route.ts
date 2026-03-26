/**
 * /api/admin/analytics/burnout — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/employees/burnout-analytics/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handleGET)
