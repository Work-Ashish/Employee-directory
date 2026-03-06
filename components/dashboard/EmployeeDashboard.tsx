"use client"

import * as React from "react"
import { StatCard } from "./DashboardComponents"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, ClockIcon, BackpackIcon } from "@radix-ui/react-icons"
import { KudosWidget } from "./KudosWidget"
import { TimeTracker } from "./TimeTracker"
import { OnboardingCompanion } from "./OnboardingCompanion"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function EmployeeDashboard() {
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<any>(null)
    const isFirstLoad = React.useRef(true)

    const fetchDashboardData = React.useCallback(async () => {
        try {
            if (isFirstLoad.current) setLoading(true)
            const res = await fetch('/api/dashboard', { cache: 'no-store' })
            if (res.ok) {
                const updatedData = await res.json()
                setData(updatedData)
            } else {
                const errorJson = await res.json().catch(() => ({}));
                console.error("Dashboard API error:", res.status, errorJson.error?.message || res.statusText)
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error)
        } finally {
            isFirstLoad.current = false
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDashboardData()

        let interval: NodeJS.Timeout | null = null

        const startPolling = () => {
            if (interval) clearInterval(interval)
            interval = setInterval(() => {
                fetchDashboardData()
            }, 30000) // 30s polling (prevents connection storm at scale)
        }

        const handleVisibility = () => {
            if (document.hidden) {
                if (interval) clearInterval(interval)
                interval = null
            } else {
                fetchDashboardData()
                startPolling()
            }
        }

        startPolling()
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            if (interval) clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [fetchDashboardData])

    return (
        <div className="relative min-h-screen overflow-hidden p-1">
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 mesh-bg opacity-[0.4] dark:opacity-[0.2] pointer-events-none" />
            <div className="orb w-[400px] h-[400px] bg-[rgba(0,122,255,0.15)] top-[-100px] right-[-100px]" />
            <div className="orb w-[300px] h-[300px] bg-[rgba(175,82,222,0.1)] bottom-[100px] left-[-50px]" style={{ animationDelay: '-5s' }} />

            <div className="relative z-10 space-y-8 animate-[pageIn_0.6s_ease-out]">
                {/* Hero Section */}
                <div className="hero-text flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[var(--accent)] to-[#5856d6] p-8 md:p-10 rounded-[32px] text-white shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.05] rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                        <h1 className="text-[32px] md:text-[40px] font-black tracking-tight leading-tight">
                            Welcome back,<br />
                            <span className="text-[#a5ccff]">Ready for a great day?</span>
                        </h1>
                        <p className="text-[14px] md:text-[16px] text-white/80 mt-4 max-w-[450px] font-medium leading-relaxed">
                            {data?.stats?.attendanceCount > 0
                                ? `You've been present for ${data?.stats?.attendanceCount} days this month. Keep up the high performance!`
                                : "Check-in to start your day and track your progress."}
                        </p>
                        <div className="flex gap-3 mt-8">
                            <Link href="/profile" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-[14px] font-bold transition-all border border-white/10">View Profile</Link>
                            <Link href="/calendar" className="px-6 py-2.5 bg-white text-[var(--accent)] rounded-xl text-[14px] font-bold transition-all hover:shadow-lg">Calendar</Link>
                        </div>
                    </div>

                    <div className="relative z-10 hidden lg:flex items-center" />
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="glass-premium p-6 h-[180px] rounded-[24px] animate-pulse" />
                        ))
                    ) : (
                        <>
                            <StatCard
                                label="Attendance"
                                value={data?.stats?.attendanceCount || 0}
                                sub="Days present this month"
                                badge="Live"
                                badgeType="up"
                                icon={<ClockIcon className="w-6 h-6" />}
                                iconClass="bg-blue-500/10 text-blue-500"
                            />
                            <StatCard
                                label="Leave Balance"
                                value={data?.stats?.leaveBalance || 0}
                                sub="Available days"
                                badge="Yearly"
                                badgeType="neutral"
                                icon={<CalendarIcon className="w-6 h-6" />}
                                iconClass="bg-green-500/10 text-green-500"
                            />
                            <StatCard
                                label="Pending Training"
                                value={data?.stats?.pendingTrainingCount || 0}
                                sub="Assigned modules"
                                badge={data?.stats?.pendingTrainingCount > 0 ? "Priority" : "Done"}
                                badgeType={data?.stats?.pendingTrainingCount > 0 ? "down" : "up"}
                                icon={<BackpackIcon className="w-6 h-6" />}
                                iconClass="bg-amber-500/10 text-amber-500"
                            />
                            <StatCard
                                label="Review Status"
                                value={data?.stats?.reviewStatus || "Upcoming"}
                                sub="Next evaluation"
                                badge="Q1"
                                badgeType="neutral"
                                icon={<span className="text-xl">📊</span>}
                                iconClass="bg-purple-500/10 text-purple-500"
                            />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
                    <div className="space-y-8">
                        <OnboardingCompanion />

                        <div className="glass-premium p-8 rounded-[28px]">
                            <h3 className="text-[18px] font-black text-[var(--text)] mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                                    <CalendarIcon className="w-5 h-5" />
                                </div>
                                Today's Schedule
                            </h3>
                            <div className="space-y-4">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => <div key={i} className="h-16 w-full rounded-2xl bg-[var(--bg2)] animate-pulse" />)
                                ) : data?.schedule?.length > 0 ? (
                                    data.schedule.map((event: any, i: number) => (
                                        <div key={i} className={`group p-4 bg-[var(--bg)]/50 hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] rounded-2xl flex justify-between items-center transition-all duration-300 hover:shadow-md`}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-1.5 h-10 rounded-full", event.color || "bg-[var(--accent)]")} />
                                                <div>
                                                    <div className="text-[14px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{event.title}</div>
                                                    <div className="text-[11px] text-[var(--text3)] font-semibold uppercase tracking-wider">{event.type}</div>
                                                </div>
                                            </div>
                                            <div className="text-[12px] font-black text-[var(--text2)] bg-[var(--bg2)] px-3 py-1 rounded-lg">{event.time}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[14px] text-[var(--text3)] py-12 text-center bg-[var(--bg2)]/30 rounded-2xl border-2 border-dashed border-[var(--border)] font-medium">
                                        Chill day! No events scheduled for today.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8">
                        <div className="hover:scale-[1.02] transition-transform duration-300"><TimeTracker /></div>
                        <div className="hover:scale-[1.02] transition-transform duration-300"><KudosWidget /></div>

                        <div className="glass-premium p-8 rounded-[28px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-[0.02] rounded-full translate-x-16 -translate-y-16" />
                            <h3 className="text-[18px] font-black text-[var(--text)] mb-6">My Team Status</h3>
                            {loading ? (
                                <div className="space-y-4">
                                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 w-full bg-[var(--bg2)] rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {data?.teamStatus?.map((tm: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-[var(--bg)]/50 rounded-xl transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] text-white flex items-center justify-center font-black text-[12px] shadow-sm group-hover:scale-110 transition-transform">{tm.initials}</div>
                                                <div>
                                                    <span className="text-[14px] font-bold text-[var(--text2)] block group-hover:text-[var(--text)] transition-colors">{tm.name}</span>
                                                    <span className="text-[11px] text-[var(--text3)] font-medium">{tm.status === 'Active' ? 'Working Now' : 'Away'}</span>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full ring-4 transition-all duration-300 group-hover:ring-8",
                                                tm.status === 'Active' ? "bg-green-500 ring-green-500/10" : "bg-[var(--text4)] ring-[var(--text4)]/10"
                                            )} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-[var(--border)]">
                                <h4 className="text-[11px] font-black text-[var(--text3)] mb-4 uppercase tracking-[1px]">Quick Actions</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <Link href="/leave" className="py-3 px-4 text-center text-[12px] font-bold bg-[var(--bg)] hover:bg-[var(--accent)] hover:text-white transition-all rounded-xl border border-[var(--border)]">Apply Leave</Link>
                                    <Link href="/help-desk" className="py-3 px-4 text-center text-[12px] font-bold bg-[var(--bg)] hover:bg-[var(--accent)] hover:text-white transition-all rounded-xl border border-[var(--border)]">Raise Ticket</Link>
                                    <Link href="/resignation" className="col-span-2 py-3 px-4 text-center text-[12px] font-bold bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all">Resign / Exit Dashboard</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
