"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"
import { Badge } from "@/components/ui/Badge"

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
            <div className="glass p-[22px] border-dashed border-2 border-border flex flex-col items-center justify-center text-center py-8">
                <CalendarIcon className="w-8 h-8 text-text-3 mb-3 opacity-20" />
                <div className="text-base font-bold text-text mb-1">Calendar Setup Required</div>
                <p className="text-xs text-text-3 max-w-[200px]">Add Google Calendar API Key and ID to your environment variables.</p>
            </div>
        )
    }

    return (
        <div className="glass p-[22px]">
            <div className="text-base font-bold text-text mb-[16px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>📅</span> Company Calendar
                </div>
                <button
                    onClick={() => fetchEvents()}
                    className="text-[10px] text-accent hover:underline font-semibold"
                    disabled={isLoading}
                >
                    {isLoading ? "Updating..." : "Refresh"}
                </button>
            </div>

            <div className="flex flex-col gap-[12px]">
                {isLoading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[50px] bg-bg-2 animate-pulse rounded-[10px]" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-xs text-danger italic py-4 text-center glass border-danger/10">
                        {error}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-xs text-text-3 italic py-8 text-center glass border-dashed">
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
                                    isToday ? "bg-accent text-white border-accent" : "bg-surface text-text border-border"
                                )}>
                                    <span className={cn("text-[9px] font-bold uppercase", isToday ? "text-white/80" : "text-text-3")}>
                                        {format(startDate, "MMM")}
                                    </span>
                                    <span className="text-lg font-extrabold leading-tight">
                                        {format(startDate, "d")}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-base font-semibold text-text truncate group-hover:text-accent transition-colors">
                                        {event.summary}
                                    </div>
                                    <div className="text-xs text-text-3 flex items-center gap-1">
                                        {event.start.dateTime ? format(startDate, "h:mm a") : "All Day"}
                                        {isToday && <Badge variant="default" size="sm" className="ml-1">Today</Badge>}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-[16px] pt-[12px] border-t border-border">
                <a
                    href={`https://calendar.google.com/calendar/r?cid=${CALENDAR_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-3 font-semibold hover:text-accent flex items-center justify-center gap-1 transition-colors"
                >
                    View Full Calendar <ChevronRightIcon className="w-3 h-3" />
                </a>
            </div>
        </div>
    )
}
