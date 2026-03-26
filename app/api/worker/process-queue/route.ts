/**
 * /api/worker/process-queue — Django proxy (Sprint 14).
 *
 * NOTE: Django endpoint /api/v1/worker/process-queue/ does not exist yet.
 */
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
