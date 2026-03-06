"use client"

import * as React from "react"
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { cn } from "@/lib/utils"
import {
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    MixerHorizontalIcon,
    BellIcon,
    QuoteIcon
} from "@radix-ui/react-icons"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import { Spinner } from "@/components/ui/Spinner"

const locales = {
    'en-US': enUS,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

// Custom Toolbar Component
const CustomToolbar = ({ label, onNavigate, onView, view }: any) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-surface-2 backdrop-blur-md p-4 rounded-2xl border border-border shadow-lg transition-colors">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onNavigate('PREV')}
                    className="p-2 hover:bg-bg-2 rounded-xl transition-all border border-transparent hover:border-border"
                >
                    <ChevronLeftIcon className="w-5 h-5 text-text-2" />
                </button>
                <h2 className="text-lg font-black min-w-[150px] text-center text-text">{label}</h2>
                <button
                    onClick={() => onNavigate('NEXT')}
                    className="p-2 hover:bg-bg-2 rounded-xl transition-all border border-transparent hover:border-border"
                >
                    <ChevronRightIcon className="w-5 h-5 text-text-2" />
                </button>
                <Button
                    size="sm"
                    onClick={() => onNavigate('TODAY')}
                    className="ml-4 shadow-lg shadow-accent/20"
                >
                    Today
                </Button>
            </div>

            <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-xl border border-border">
                {[
                    { id: 'month', label: 'Month' },
                    { id: 'week', label: 'Week' },
                    { id: 'day', label: 'Day' }
                ].map((v) => (
                    <button
                        key={v.id}
                        onClick={() => onView(v.id)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            view === v.id ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text"
                        )}
                    >
                        {v.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

// Custom Event Component
const EventComponent = ({ event }: any) => {
    const icons: any = {
        leave: "🏝️",
        holiday: "🎉",
        birthday: "🎂",
        event: "📅"
    }

    return (
        <div className="flex items-center gap-1.5 h-full overflow-hidden">
            <span className="text-sm shrink-0">{icons[event.type] || "📍"}</span>
            <span className="truncate text-[11px] font-bold tracking-tight">{event.title}</span>
        </div>
    )
}

export default function CalendarPage() {
    const [view, setView] = React.useState<View>(Views.MONTH)
    const [date, setDate] = React.useState(new Date())
    const [events, setEvents] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    const fetchEvents = React.useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/calendar')
            if (res.ok) {
                const data = await res.json()
                const formattedEvents = data.map((evt: any) => ({
                    ...evt,
                    start: new Date(evt.start),
                    end: new Date(evt.end),
                }))
                setEvents(formattedEvents)
            }
        } catch (error) {
            console.error("Failed to fetch events:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    const eventStyleGetter = (event: any) => {
        let backgroundColor = 'var(--accent)';
        if (event.type === 'leave') backgroundColor = 'var(--amber)';
        if (event.type === 'holiday') backgroundColor = 'var(--green)';
        if (event.type === 'birthday') backgroundColor = 'var(--pink)';

        return {
            style: {
                backgroundColor,
                borderRadius: '8px',
                border: 'none',
                boxShadow: 'var(--shadow-sm)',
                padding: '2px 4px',
                color: '#fff', // Keep text white for better contrast on colored backgrounds
                fontWeight: '600'
            }
        };
    }

    const upcomingEvents = events
        .filter(e => new Date(e.start) >= new Date())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 5)

    return (
        <div className="relative min-h-screen overflow-hidden p-1 bg-bg text-text transition-colors duration-300">
            {/* Background elements */}
            <div className="fixed inset-0 mesh-bg opacity-[0.4] pointer-events-none" />
            <div className="orb w-[500px] h-[500px] bg-blue-500/10 top-[-250px] right-[-100px]" />
            <div className="orb w-[400px] h-[400px] bg-purple-500/10 bottom-[-200px] left-[-100px]" style={{ animationDelay: '-3s' }} />

            <div className="relative z-10 flex flex-col lg:flex-row h-screen gap-6 p-4 md:p-8 animate-page-in">
                {/* Left Sidebar */}
                <div className="hidden lg:flex flex-col w-[300px] shrink-0 space-y-6">
                    <Card variant="glass-premium" className="p-6 rounded-[32px] shadow-2xl bg-surface-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                                <BellIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-text">Upcoming</h3>
                        </div>
                        <div className="space-y-4">
                            {upcomingEvents.length > 0 ? upcomingEvents.map((evt, i) => (
                                <div key={i} className="group p-3 hover:bg-bg-2 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-border">
                                    <div className="flex items-start gap-3">
                                        <div className="text-xl pt-1">{evt.type === 'leave' ? '🏝️' : evt.type === 'holiday' ? '🎉' : '📅'}</div>
                                        <div>
                                            <div className="text-sm font-black group-hover:text-accent transition-colors leading-tight text-text-2">{evt.title}</div>
                                            <div className="text-[11px] text-text-3 font-bold mt-1 uppercase tracking-wider">{format(evt.start, 'MMM dd, yyyy')}</div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-xs text-text-4 py-8 text-center bg-bg-2 rounded-2xl border-2 border-dashed border-border">No upcoming events</div>
                            )}
                        </div>
                        <Button
                            onClick={fetchEvents}
                            loading={loading}
                            leftIcon={<CalendarIcon className={cn("w-4 h-4 group-hover:rotate-12 transition-transform", loading && "animate-spin")} />}
                            className="w-full mt-6 rounded-2xl shadow-lg shadow-accent/20 group"
                        >
                            {loading ? "Syncing..." : "Sync with Google"}
                        </Button>
                    </Card>

                    <Card variant="glass-premium" className="p-6 rounded-[32px] flex-1 overflow-hidden flex flex-col bg-surface-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-text-3 mb-6 px-2">Filters</h3>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {['Company Events', 'Leaves', 'Holidays', 'Birthdays', 'Google Sync'].map((filter, i) => (
                                <label key={i} className="flex items-center justify-between p-3 hover:bg-bg-2 rounded-xl cursor-pointer group transition-all">
                                    <span className="text-sm font-bold text-text-2 group-hover:text-text transition-colors">{filter}</span>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded-md accent-accent border-border bg-transparent" />
                                </label>
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-gradient-to-br from-accent/10 to-purple/10 rounded-3xl border border-border">
                            <QuoteIcon className="w-4 h-4 mb-2 text-accent" />
                            <p className="text-[11px] font-medium leading-relaxed italic text-text-3 font-bold">"Time management is the key to work-life balance."</p>
                        </div>
                    </Card>
                </div>

                {/* Main Calendar Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight leading-none mb-2 text-text">Team Hub</h1>
                            <p className="text-sm text-text-3 font-bold uppercase tracking-widest">Unified Calendar v2.0</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center bg-surface px-4 py-2.5 rounded-2xl border border-border focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10 transition-all">
                                <MagnifyingGlassIcon className="w-4 h-4 text-text-4" />
                                <input placeholder="Search events..." className="bg-transparent border-none focus:outline-none ml-3 text-sm font-medium w-[200px] text-text" />
                            </div>
                            <button className="w-12 h-12 bg-text text-bg rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-black/10 dark:shadow-white/5">
                                <PlusIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </header>

                    <Card variant="glass-premium" className="flex-1 rounded-[40px] p-6 md:p-8 flex flex-col shadow-2xl overflow-hidden relative bg-surface-2">
                        {loading && (
                            <div className="absolute inset-0 bg-bg/40 backdrop-blur-md z-[100] flex items-center justify-center rounded-[40px]">
                                <div className="flex flex-col items-center gap-4 bg-surface p-8 rounded-[32px] border border-border shadow-2xl">
                                    <Spinner size="lg" className="w-12 h-12 text-accent" />
                                    <span className="text-base font-black text-text animate-pulse">Syncing Hub...</span>
                                </div>
                            </div>
                        )}

                        <style jsx global>{`
                            .rbc-calendar { font-family: inherit; color: var(--text) !important; }
                            .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: none !important; background: transparent !important; }
                            .rbc-header {
                                border: none !important;
                                padding: 15px !important;
                                font-weight: 900 !important;
                                color: var(--text3) !important;
                                text-transform: uppercase !important;
                                font-size: 11px !important;
                                letter-spacing: 1.5px !important;
                                border-bottom: 1px solid var(--border) !important;
                            }
                            .rbc-month-row { border: none !important; }
                            .rbc-day-bg { border: 1px solid var(--border) !important; transition: all 0.3s ease; }
                            .rbc-day-bg:hover { background: var(--bg2) !important; opacity: 0.5; }
                            .rbc-date-cell { padding: 8px !important; font-weight: 900 !important; font-size: 14px !important; color: var(--text2) !important; }
                            .rbc-off-range-bg { background: var(--bg2) !important; opacity: 0.2 !important; }
                            .rbc-today { background: var(--glow) !important; }
                            .rbc-today .rbc-date-cell { color: var(--accent) !important; }
                            .rbc-event { border: none !important; outline: none !important; }
                            .rbc-event:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
                            .rbc-show-more { color: var(--accent) !important; font-weight: 900 !important; font-size: 11px !important; margin-left: 8px !important; }

                            /* Time View fixes for Day/Week mode */
                            .rbc-time-view .rbc-header { border-left: 1px solid var(--border) !important; }
                            .rbc-time-content { border-top: 1px solid var(--border2) !important; }
                            .rbc-time-header-content { border-left: 1px solid var(--border2) !important; }
                            .rbc-timeslot-group { border-bottom: 1px solid var(--border) !important; min-height: 50px !important; }
                            .rbc-day-slot { border-left: 1px solid var(--border) !important; }
                            .rbc-label { color: var(--text3) !important; font-weight: 800 !important; font-size: 11px !important; }
                            .rbc-time-view .rbc-allday-cell { background: var(--bg2) !important; border-bottom: 1px solid var(--border2) !important; }
                            .rbc-current-time-indicator { background-color: var(--accent) !important; height: 3px !important; }
                            .rbc-time-gutter { border-right: 1px solid var(--border) !important; }
                            .rbc-timeslot-group .rbc-time-slot { border-top-color: var(--border) !important; opacity: 0.1; }

                            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }
                        `}</style>

                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            views={['month', 'week', 'day']}
                            view={view}
                            onView={setView}
                            date={date}
                            onNavigate={setDate}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                toolbar: CustomToolbar,
                                event: EventComponent
                            }}
                            className="flex-1"
                        />
                    </Card>
                </div>
            </div>
        </div>
    )
}
