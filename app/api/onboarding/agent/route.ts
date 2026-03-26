/**
 * /api/onboarding/agent — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/onboarding/agent/ does not exist yet.
 */
import { NextResponse } from "next/server"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET(_req: Request, _context: AuthContext) {
    return NextResponse.json({
        data: {
            message:
                "Welcome aboard. Start by reviewing your profile, checking today's schedule, and using the dashboard widgets to stay on top of your work. If something seems missing, your HR or admin team may still be finishing your workspace setup.",
        },
    })
}

async function handlePOST(_req: Request, _context: AuthContext) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.DASHBOARD, action: Action.CREATE }, handlePOST)
