"use client"

import * as React from "react"
import { DashboardStatCard } from "./DashboardComponents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
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
            const res = await fetch("/api/dashboard", { cache: "no-store" })
            if (res.ok) {
                const updatedData = await res.json()
                setData(updatedData)
            } else {
                const errorJson = await res.json().catch(() => ({}))
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
            interval = setInterval(fetchDashboardData, 30000)
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
            {/* Background */}
            <div className="fixed inset-0 mesh-bg opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="orb w-[400px] h-[400px] bg-accent/15 top-[-100px] right-[-100px]" />
            <div className="orb w-[300px] h-[300px] bg-purple/10 bottom-[100px] left-[-50px]" style={{ animationDelay: "-5s" }} />

            <div className="relative z-10 space-y-8 animate-page-in">
                {/* Hero Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-accent to-purple p-8 md:p-10 rounded-2xl text-white shadow-lg overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                        <h1 className="text-[32px] md:text-[40px] font-black tracking-tight leading-tight">
                            Welcome back,<br />
                            <span className="text-white/70">Ready for a great day?</span>
                        </h1>
                        <p className="text-md text-white/80 mt-4 max-w-[450px] font-medium leading-relaxed">
                            {data?.stats?.attendanceCount > 0
                                ? `You've been present for ${data?.stats?.attendanceCount} days this month. Keep up the high performance!`
                                : "Check-in to start your day and track your progress."}
                        </p>
                        <div className="flex gap-3 mt-8">
                            <Link href="/profile" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-md font-bold transition-all border border-white/10">
                                View Profile
                            </Link>
                            <Link href="/calendar" className="px-6 py-2.5 bg-white text-accent rounded-xl text-md font-bold transition-all hover:shadow-lg">
                                Calendar
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="bg-surface border border-border rounded-xl p-5 h-[140px] animate-pulse" />
                        ))
                    ) : (
                        <>
                            <DashboardStatCard label="Attendance" value={data?.stats?.attendanceCount || 0} sub="Days present this month" badge="Live" badgeType="up" icon={<ClockIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Leave Balance" value={data?.stats?.leaveBalance || 0} sub="Available days" badge="Yearly" badgeType="neutral" icon={<CalendarIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Pending Training" value={data?.stats?.pendingTrainingCount || 0} sub="Assigned modules"
                                badge={data?.stats?.pendingTrainingCount > 0 ? "Priority" : "Done"}
                                badgeType={data?.stats?.pendingTrainingCount > 0 ? "down" : "up"}
                                icon={<BackpackIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Review Status" value={data?.stats?.reviewStatus || "Upcoming"} sub="Next evaluation" badge="Q1" badgeType="neutral" icon={<span className="text-lg">📊</span>} />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                    <div className="space-y-6">
                        <OnboardingCompanion />

                        {/* Today's Schedule */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {loading ? (
                                        Array(3).fill(0).map((_, i) => <div key={i} className="h-16 w-full rounded-xl bg-bg-2 animate-pulse" />)
                                    ) : data?.schedule?.length > 0 ? (
                                        data.schedule.map((event: any, i: number) => (
                                            <div key={i} className="group p-4 bg-bg/50 hover:bg-surface border border-transparent hover:border-border rounded-xl flex justify-between items-center transition-all duration-200 hover:shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-1 h-10 rounded-full", event.color || "bg-accent")} />
                                                    <div>
                                                        <div className="text-md font-bold text-text group-hover:text-accent transition-colors">{event.title}</div>
                                                        <div className="text-xs text-text-3 font-semibold uppercase tracking-wider">{event.type}</div>
                                                    </div>
                                                </div>
                                                <Badge variant="neutral" size="sm">{event.time}</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-md text-text-3 py-12 text-center bg-bg-2/30 rounded-xl border-2 border-dashed border-border font-medium">
                                            No events scheduled for today.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <TimeTracker />
                        <KudosWidget />

                        {/* My Team + Quick Actions */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-lg">My Team Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-4">
                                        {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 w-full bg-bg-2 rounded-xl animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data?.teamStatus?.map((tm: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 hover:bg-bg/50 rounded-xl transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={tm.name || tm.initials || "?"} size="default" />
                                                    <div>
                                                        <span className="text-md font-bold text-text-2 block group-hover:text-text transition-colors">{tm.name}</span>
                                                        <span className="text-xs text-text-3 font-medium">{tm.status === "Active" ? "Working Now" : "Away"}</span>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-2.5 h-2.5 rounded-full ring-4 transition-all duration-300",
                                                    tm.status === "Active" ? "bg-success ring-success/10" : "bg-text-4 ring-text-4/10"
                                                )} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 pt-5 border-t border-border">
                                    <h4 className="text-xs font-bold text-text-3 mb-3 uppercase tracking-wider">Quick Actions</h4>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <Link href="/leave">
                                            <Button variant="secondary" size="sm" className="w-full">Apply Leave</Button>
                                        </Link>
                                        <Link href="/help-desk">
                                            <Button variant="secondary" size="sm" className="w-full">Raise Ticket</Button>
                                        </Link>
                                        <Link href="/resignation" className="col-span-2">
                                            <Button variant="danger" size="sm" className="w-full">Resign / Exit Dashboard</Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
