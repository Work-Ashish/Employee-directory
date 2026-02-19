import * as React from "react"
import { StatCard } from "./DashboardComponents"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, ClockIcon, BackpackIcon } from "@radix-ui/react-icons"
import { KudosWidget } from "./KudosWidget"
import { TimeTracker } from "./TimeTracker"

export function EmployeeDashboard() {
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false)
        }, 1500)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="space-y-6">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Dashboard</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Welcome back! Here's your overview for today.</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="glass p-5 h-[160px] flex flex-col justify-between">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Attendance (This Month)"
                            value="22 Days"
                            sub="Total Present Days"
                            badge="98% on time"
                            badgeType="up"
                            icon={<ClockIcon className="w-5 h-5" />}
                            iconClass="bg-[var(--blue-dim)] text-[var(--blue)]"
                            glowClass="before:bg-[rgba(50,173,230,0.1)]"
                        />
                        <StatCard
                            label="Leave Balance"
                            value="12 Days"
                            sub="Casual Leave Remaining"
                            badge="5 Sick Leaves"
                            badgeType="neutral"
                            icon={<CalendarIcon className="w-5 h-5" />}
                            iconClass="bg-[var(--green-dim)] text-[var(--green)]"
                            glowClass="before:bg-[rgba(52,199,89,0.1)]"
                        />
                        <StatCard
                            label="Pending Training"
                            value="2 Modules"
                            sub="Compliance & Security"
                            badge="Due in 3 days"
                            badgeType="down"
                            icon={<BackpackIcon className="w-5 h-5" />}
                            iconClass="bg-[var(--amber-dim)] text-[var(--amber)]"
                            glowClass="before:bg-[rgba(255,149,0,0.1)]"
                        />
                        <StatCard
                            label="Review Status"
                            value="Upcoming"
                            sub="Quarterly Review"
                            badge="Scheduled Oct 15"
                            badgeType="neutral"
                            icon={<span className="text-xl">📊</span>}
                            iconClass="bg-[var(--purple-dim)] text-[var(--purple)]"
                            glowClass="before:bg-[rgba(175,82,222,0.1)]"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-[1.5fr_1fr] gap-6">
                {/* Recent Schedule */}
                <div className="glass p-6">
                    <h3 className="text-[16px] font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[var(--accent)]" />
                        Today's Schedule
                    </h3>
                    <div className="space-y-4">
                        {[
                            { time: "09:30 AM", title: "Daily Standup", type: "Meeting", color: "border-l-4 border-blue-500" },
                            { time: "11:00 AM", title: "Project Sync: Q4 Roadmap", type: "Zoom Call", color: "border-l-4 border-purple-500" },
                            { time: "02:00 PM", title: "Training: Security Compliance", type: "Learning", color: "border-l-4 border-amber-500" },
                        ].map((event, i) => (
                            <div key={i} className={`p-3 bg-[var(--bg2)] rounded-r-lg ${event.color} flex justify-between items-center`}>
                                <div>
                                    <div className="text-[13px] font-semibold text-[var(--text)]">{event.title}</div>
                                    <div className="text-[11px] text-[var(--text3)]">{event.type}</div>
                                </div>
                                <div className="text-[12px] font-mono text-[var(--text2)]">{event.time}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Status or Announcements */}
                <div className="flex flex-col gap-6">
                    <TimeTracker />
                    <KudosWidget />
                    <div className="glass p-6">
                        <h3 className="text-[16px] font-bold text-[var(--text)] mb-4">My Team Status</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[13px]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs">JD</div>
                                    <span className="text-[var(--text)]">John Doe</span>
                                </div>
                                <span className="text-[11px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Active</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold text-xs">SM</div>
                                    <span className="text-[var(--text)]">Sarah Miller</span>
                                </div>
                                <span className="text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">On Break</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs">RJ</div>
                                    <span className="text-[var(--text)]">Robert James</span>
                                </div>
                                <span className="text-[11px] text-[var(--text4)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">Offline</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[var(--border)]">
                            <h4 className="text-[12px] font-semibold text-[var(--text2)] mb-2 uppercase tracking-wide">Quick Actions</h4>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 text-[12px] bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg3)] transition-colors">Apply Leave</button>
                                <button className="flex-1 py-2 text-[12px] bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg3)] transition-colors">Raise Ticket</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
