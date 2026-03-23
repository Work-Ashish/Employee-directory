/**
 * /api/dashboard/logins — Local handler for login stats.
 *
 * Django has no dedicated logins dashboard endpoint.
 * Returns active-today count and recent login placeholders.
 * In production this should query Django's session/audit log endpoints.
 */
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
    // Without a Django sessions/audit endpoint, return minimal data.
    // The dashboard will show "0 Active Today" and no recent logins,
    // which is accurate until a login-tracking endpoint exists.
    return NextResponse.json({
        data: {
            activeTodayCount: 0,
            recentLogins: [],
            totalSessions: 0,
            activeSessions: 0,
            loginsLast7Days: 0,
        },
    })
}
