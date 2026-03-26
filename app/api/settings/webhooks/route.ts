/**
 * /api/settings/webhooks — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/webhooks/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

async function handlePOST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.SETTINGS, action: Action.CREATE }, handlePOST)
