"use client"

import * as React from "react"
import { StatCard } from "./DashboardComponents"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, ClockIcon, BackpackIcon } from "@radix-ui/react-icons"
import { KudosWidget } from "./KudosWidget"
import { TimeTracker } from "./TimeTracker"

export function EmployeeDashboard() {
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<any>(null)

    const fetchDashboardData = React.useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/dashboard')
            if (res.ok) {
                setData(await res.json())
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

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
                            value={`${data?.stats?.attendanceCount || 0} Days`}
                            sub="Total Present Days"
                            badge="Live Status"
                            badgeType="up"
                            icon={<ClockIcon className="w-5 h-5" />}
                            iconClass="bg-[var(--blue-dim)] text-[var(--blue)]"
                            glowClass="before:bg-[rgba(50,173,230,0.1)]"
                        />
                        <StatCard
                            label="Leave Balance"
                            value={`${data?.stats?.leaveBalance || 0} Days`}
                            sub="Remaining Leaves"
                            badge="Yearly Allocation"
                            badgeType="neutral"
                            icon={<CalendarIcon className="w-5 h-5" />}
                            iconClass="bg-[var(--green-dim)] text-[var(--green)]"
                            glowClass="before:bg-[rgba(52,199,89,0.1)]"
                        />
                        <StatCard
                            label="Pending Training"
                            value={`${data?.stats?.pendingTrainingCount || 0} Modules`}
                            sub="Assigned to you"
                            badge={data?.stats?.pendingTrainingCount > 0 ? "To Complete" : "All Done"}
                            badgeType={data?.stats?.pendingTrainingCount > 0 ? "down" : "up"}
                            icon={<BackpackIcon className="w-5 h-5" />}
                            iconClass="bg-[var(--amber-dim)] text-[var(--amber)]"
                            glowClass="before:bg-[rgba(255,149,0,0.1)]"
                        />
                        <StatCard
                            label="Review Status"
                            value={data?.stats?.reviewStatus || "Upcoming"}
                            sub="Next Performance Review"
                            badge="Quarterly"
                            badgeType="neutral"
                            icon={<span className="text-xl">📊</span>}
                            iconClass="bg-[var(--purple-dim)] text-[var(--purple)]"
                            glowClass="before:bg-[rgba(175,82,222,0.1)]"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-[1.5fr_1fr] gap-6">
                <div className="glass p-6">
                    <h3 className="text-[16px] font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[var(--accent)]" />
                        Today's Schedule
                    </h3>
                    <div className="space-y-4">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                        ) : data?.schedule?.length > 0 ? (
                            data.schedule.map((event: any, i: number) => (
                                <div key={i} className={`p-3 bg-[var(--bg2)] rounded-r-lg ${event.color} flex justify-between items-center`}>
                                    <div>
                                        <div className="text-[13px] font-semibold text-[var(--text)]">{event.title}</div>
                                        <div className="text-[11px] text-[var(--text3)]">{event.type}</div>
                                    </div>
                                    <div className="text-[12px] font-mono text-[var(--text2)]">{event.time}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[13px] text-[var(--text3)] py-8 text-center bg-[var(--bg2)] rounded-lg">No events scheduled for today</div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <TimeTracker />
                    <KudosWidget />
                    <div className="glass p-6">
                        <h3 className="text-[16px] font-bold text-[var(--text)] mb-4">My Team Status</h3>
                        {loading ? (
                            <div className="space-y-3">
                                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data?.teamStatus?.map((tm: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-[13px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs">{tm.initials}</div>
                                            <span className="text-[var(--text)]">{tm.name}</span>
                                        </div>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${tm.status === 'Active' ? 'text-green-500 bg-green-500/10' : 'text-[var(--text4)] bg-[var(--bg3)]'}`}>
                                            {tm.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

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
