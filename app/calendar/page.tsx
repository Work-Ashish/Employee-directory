"use client"

import * as React from "react"
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { cn } from "@/lib/utils"

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

const events = [
    {
        id: 1,
        title: 'New Year Holiday',
        start: new Date(2024, 0, 1),
        end: new Date(2024, 0, 1),
        allDay: true,
        type: 'holiday'
    },
    {
        id: 2,
        title: 'Sarah Davis (Leave)',
        start: new Date(2024, 2, 10),
        end: new Date(2024, 2, 12),
        type: 'leave'
    },
    {
        id: 3,
        title: 'Mike T. Birthday',
        start: new Date(2024, 2, 15),
        end: new Date(2024, 2, 15),
        allDay: true,
        type: 'birthday'
    },
    {
        id: 4,
        title: 'Team Building',
        start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2, 14, 0),
        end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2, 16, 0),
        type: 'event'
    }
]

export default function CalendarPage() {
    const [view, setView] = React.useState(Views.MONTH)
    const [date, setDate] = React.useState(new Date())

    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3174ad';
        if (event.type === 'leave') backgroundColor = '#f59e0b';
        if (event.type === 'holiday') backgroundColor = '#10b981';
        if (event.type === 'birthday') backgroundColor = '#ec4899';

        return {
            style: {
                backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    }

    return (
        <div className="space-y-6 h-full flex flex-col animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[10px] shrink-0">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Team Calendar</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">View schedule, leaves, and upcoming events</p>
            </div>

            <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] p-6 shadow-sm overflow-hidden flex flex-col glass">
                <style jsx global>{`
                    .rbc-calendar { font-family: inherit; color: var(--text); min-height: 600px; }
                    .rbc-toolbar button { color: var(--text); border-color: var(--border); }
                    .rbc-toolbar button:hover { bg-color: var(--bg2); }
                    .rbc-toolbar button.rbc-active { background-color: var(--accent); color: white; border-color: var(--accent); }
                    .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: var(--border); }
                    .rbc-header { border-bottom-color: var(--border); }
                    .rbc-day-bg + .rbc-day-bg { border-left-color: var(--border); }
                    .rbc-off-range-bg { background-color: var(--bg2); }
                    .rbc-today { background-color: rgba(0,122,255,0.05); }
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
                    className="flex-1"
                />
            </div>
        </div>
    )
}
