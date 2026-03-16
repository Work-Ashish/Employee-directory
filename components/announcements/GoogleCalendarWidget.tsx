"use client"

import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { EventAPI } from "@/features/events/api/client"
import { format, isSameDay } from "date-fns"
import { CalendarIcon, ChevronRightIcon, PlusIcon } from "@radix-ui/react-icons"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { toast } from "sonner"
import { hasPermission, Module, Action } from "@/lib/permissions"
import { useAuth } from "@/context/AuthContext"

type CalendarEvent = {
    id: string
    title: string
    start: string
    end: string
    allDay: boolean
    type: string
}

export function GoogleCalendarWidget() {
    const { user } = useAuth()
    const [events, setEvents] = React.useState<CalendarEvent[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [showCreate, setShowCreate] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)

    // Form state
    const [title, setTitle] = React.useState("")
    const [start, setStart] = React.useState("")
    const [end, setEnd] = React.useState("")
    const [allDay, setAllDay] = React.useState(false)
    const [type, setType] = React.useState("EVENT")

    const canCreate = hasPermission(user?.role ?? "", Module.ANNOUNCEMENTS, Action.CREATE)

    const fetchEvents = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await EventAPI.list()
            const all = extractArray<CalendarEvent>(data)
            // Show only upcoming events
            const now = new Date()
            const upcoming = all.filter(e => new Date(e.end || e.start) >= now)
            setEvents(upcoming.slice(0, 5))
        } catch {
            console.error("Failed to fetch events")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    const resetForm = () => {
        setTitle("")
        setStart("")
        setEnd("")
        setAllDay(false)
        setType("EVENT")
    }

    const handleCreate = async () => {
        if (!title || !start || !end) {
            toast.error("Title, start and end are required")
            return
        }
        setSubmitting(true)
        try {
            await EventAPI.create({
                title,
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                allDay,
                type,
            })
            toast.success("Event created")
            setShowCreate(false)
            resetForm()
            fetchEvents()
        } catch (error: any) {
            toast.error(error.message || "Failed to create event")
        } finally {
            setSubmitting(false)
        }
    }

    const getTypeColor = (t: string) => {
        switch (t) {
            case "HOLIDAY": return "bg-success text-white border-success"
            case "MEETING": return "bg-accent text-white border-accent"
            case "DEADLINE": return "bg-danger text-white border-danger"
            default: return "bg-surface text-text border-border"
        }
    }

    return (
        <div className="glass p-[22px]">
            <div className="text-base font-bold text-text mb-[16px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-accent" /> Company Calendar
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchEvents()}
                        className="text-[10px] text-accent hover:underline font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? "Updating..." : "Refresh"}
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => { resetForm(); setShowCreate(true) }}
                            className="text-[10px] text-accent hover:underline font-semibold flex items-center gap-0.5"
                        >
                            <PlusIcon className="w-3 h-3" /> Add
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-[12px]">
                {isLoading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[50px] bg-bg-2 animate-pulse rounded-[10px]" />
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                        <CalendarIcon className="w-6 h-6 text-text-4" />
                        <div className="text-xs text-text-3 italic text-center">No upcoming events</div>
                        {canCreate && (
                            <button
                                onClick={() => { resetForm(); setShowCreate(true) }}
                                className="text-xs text-accent hover:underline font-semibold mt-1"
                            >
                                Create an event
                            </button>
                        )}
                    </div>
                ) : (
                    events.map(event => {
                        const startDate = new Date(event.start)
                        const isToday = isSameDay(startDate, new Date())

                        return (
                            <div key={event.id} className="flex items-center gap-[12px] group">
                                <div className={cn(
                                    "flex flex-col items-center p-[6px_10px] rounded-[10px] border shadow-sm shrink-0 min-w-[54px] transition-all",
                                    isToday ? "bg-accent text-white border-accent" : getTypeColor(event.type)
                                )}>
                                    <span className={cn("text-[9px] font-bold uppercase", isToday ? "text-white/80" : "opacity-60")}>
                                        {format(startDate, "MMM")}
                                    </span>
                                    <span className="text-lg font-extrabold leading-tight">
                                        {format(startDate, "d")}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-base font-semibold text-text truncate group-hover:text-accent transition-colors">
                                        {event.title}
                                    </div>
                                    <div className="text-xs text-text-3 flex items-center gap-1">
                                        {event.allDay ? "All Day" : format(startDate, "h:mm a")}
                                        {isToday && <Badge variant="default" size="sm" className="ml-1">Today</Badge>}
                                        <Badge variant="neutral" size="sm" className="ml-1">{event.type}</Badge>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {events.length > 0 && (
                <div className="mt-[16px] pt-[12px] border-t border-border">
                    <a
                        href="/calendar"
                        className="text-xs text-text-3 font-semibold hover:text-accent flex items-center justify-center gap-1 transition-colors"
                    >
                        View Full Calendar <ChevronRightIcon className="w-3 h-3" />
                    </a>
                </div>
            )}

            {/* Create Event Modal */}
            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Create Event"
            >
                <div className="space-y-4">
                    <Input
                        label="Title *"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Team Meeting"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">Start *</label>
                            <input
                                type="datetime-local"
                                value={start}
                                onChange={e => setStart(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">End *</label>
                            <input
                                type="datetime-local"
                                value={end}
                                onChange={e => setEnd(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="EVENT">Event</option>
                            <option value="MEETING">Meeting</option>
                            <option value="HOLIDAY">Holiday</option>
                            <option value="DEADLINE">Deadline</option>
                        </Select>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allDay}
                                    onChange={e => setAllDay(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
                                />
                                <span className="text-sm font-medium text-text">All Day</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button onClick={handleCreate} loading={submitting}>Create Event</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
