/**
 * /api/settings/webhooks/[id] — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/webhooks/{id}/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

async function handlePUT() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

async function handleDELETE() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, handleGET)
export const PUT = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, handlePUT)
export const DELETE = withAuth({ module: Module.SETTINGS, action: Action.DELETE }, handleDELETE)
