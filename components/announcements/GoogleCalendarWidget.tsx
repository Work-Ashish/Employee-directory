"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"

type CalendarEvent = {
    id: string
    summary: string
    description?: string
    start: {
        dateTime?: string
        date?: string
    }
    end: {
        dateTime?: string
        date?: string
    }
}

export function GoogleCalendarWidget() {
    const [events, setEvents] = React.useState<CalendarEvent[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY
    const CALENDAR_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID

    const fetchEvents = React.useCallback(async () => {
        if (!API_KEY || !CALENDAR_ID) {
            setError("Setup Required")
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            setError(null)
            const timeMin = new Date().toISOString()
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&maxResults=5&singleEvents=true&orderBy=startTime`

            const res = await fetch(url)
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error?.message || "Failed to fetch events")
            }

            const data = await res.json()
            setEvents(data.items || [])
        } catch (err: any) {
            console.error("Calendar fetch error:", err)
            setError(err.message || "Connection failed")
        } finally {
            setIsLoading(false)
        }
    }, [API_KEY, CALENDAR_ID])

    React.useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    if (!API_KEY || !CALENDAR_ID) {
        return (
            <div className="glass p-[22px] border-dashed border-2 border-[var(--border)] flex flex-col items-center justify-center text-center py-8">
                <CalendarIcon className="w-8 h-8 text-[var(--text3)] mb-3 opacity-20" />
                <div className="text-[13.5px] font-bold text-[var(--text)] mb-1">Calendar Setup Required</div>
                <p className="text-[11px] text-[var(--text3)] max-w-[200px]">Add Google Calendar API Key and ID to your environment variables.</p>
            </div>
        )
    }

    return (
        <div className="glass p-[22px]">
            <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>📅</span> Company Calendar
                </div>
                <button
                    onClick={() => fetchEvents()}
                    className="text-[10px] text-[var(--accent)] hover:underline font-semibold"
                    disabled={isLoading}
                >
                    {isLoading ? "Updating..." : "Refresh"}
                </button>
            </div>

            <div className="flex flex-col gap-[12px]">
                {isLoading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[50px] bg-[var(--bg2)] animate-pulse rounded-[10px]" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-[11px] text-[var(--red)] italic py-4 text-center glass border-[var(--red-dim)]">
                        {error}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-[11px] text-[var(--text3)] italic py-8 text-center glass border-dashed">
                        No upcoming events found
                    </div>
                ) : (
                    events.map(event => {
                        const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!)
                        const isToday = isSameDay(startDate, new Date())

                        return (
                            <div key={event.id} className="flex items-center gap-[12px] group">
                                <div className={cn(
                                    "flex flex-col items-center p-[6px_10px] rounded-[10px] border shadow-sm shrink-0 min-w-[54px] transition-all",
                                    isToday ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)]"
                                )}>
                                    <span className={cn("text-[9px] font-bold uppercase", isToday ? "text-white/80" : "text-[var(--text3)]")}>
                                        {format(startDate, "MMM")}
                                    </span>
                                    <span className="text-[16px] font-extrabold leading-tight">
                                        {format(startDate, "d")}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[13px] font-semibold text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                                        {event.summary}
                                    </div>
                                    <div className="text-[11px] text-[var(--text3)] flex items-center gap-1">
                                        {event.start.dateTime ? format(startDate, "h:mm a") : "All Day"}
                                        {isToday && <span className="text-[9px] font-bold text-[var(--accent)] px-1 pb-[1px] rounded bg-[var(--accent-dim)] ml-1">Today</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-[16px] pt-[12px] border-t border-[var(--border)]">
                <a
                    href={`https://calendar.google.com/calendar/r?cid=${CALENDAR_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[var(--text3)] font-semibold hover:text-[var(--accent)] flex items-center justify-center gap-1 transition-colors"
                >
                    View Full Calendar <ChevronRightIcon className="w-3 h-3" />
                </a>
            </div>
        </div>
    )
}
