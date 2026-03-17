import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { google } from "googleapis"

export async function GET() {
    try {
        const session = await getServerSession()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Google Calendar integration requires a separate OAuth flow (not part of Django JWT auth).
        // TODO: Re-implement Google OAuth token storage when Google Calendar integration is restored.
        const accessToken: string | undefined = undefined
        if (accessToken) {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            )
            oauth2Client.setCredentials({ access_token: accessToken })

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

            try {
                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: new Date().toISOString(),
                    maxResults: 10,
                    singleEvents: true,
                    orderBy: 'startTime',
                })

                const googleEvents = response.data.items?.map((event: any) => ({
                    id: event.id,
                    title: event.summary,
                    start: new Date(event.start.dateTime || event.start.date),
                    end: new Date(event.end.dateTime || event.end.date),
                    type: 'event', // Mark as Google event
                    allDay: !event.start.dateTime,
                })) || []

                // Combine with team events if needed, for now just return Google events
                return NextResponse.json(googleEvents)
            } catch (googleError) {
                console.error("[GOOGLE_CALENDAR_API_ERROR]", googleError)
                // Fallback to empty if Google fails
            }
        }

        // Return empty or team events if not authenticated with Google
        return NextResponse.json([])
    } catch (error) {
        console.error("[CALENDAR_GET_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
