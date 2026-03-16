"use client"

import * as React from "react"
import { DashboardStatCard, DeptRow } from "./DashboardComponents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { CalendarIcon, ClockIcon, BackpackIcon, RocketIcon } from "@radix-ui/react-icons"
import { TimeTracker } from "./TimeTracker"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { DashboardAPI } from "@/features/dashboard/api/client"

interface PayrollStats {
    totalPayout: number
    pendingCount: number
    processedCount: number
    paidCount: number
    totalEmployees: number
}

interface PFStats {
    totalPFThisMonth: number
    pfRecordCount: number
}

interface DashboardData {
    stats: {
        attendanceCount: number
        leavesUsed: number
        pendingTrainingCount: number
        reviewStatus: string
    } | null
    payrollStats: PayrollStats
    pfStats: PFStats
    teamStatus: any[]
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
}

function formatCurrency(value: number): string {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`
    if (value >= 100000) return `${(value / 100000).toFixed(1)}L`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
}

export function PayrollDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<DashboardData | null>(null)
    const isFirstLoad = React.useRef(true)

    const fetchDashboardData = React.useCallback(async () => {
        try {
            if (isFirstLoad.current) setLoading(true)
            const dashData = await DashboardAPI.getStats()
            setData(dashData as unknown as DashboardData)
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

    const payrollStats = data?.payrollStats
    const pfStats = data?.pfStats

    // Compute coverage percentages
    const total = payrollStats?.totalEmployees || 1
    const pendingPct = Math.round(((payrollStats?.pendingCount || 0) / total) * 100)
    const processedPct = Math.round(((payrollStats?.processedCount || 0) / total) * 100)
    const paidPct = Math.round(((payrollStats?.paidCount || 0) / total) * 100)

    return (
        <div className="relative min-h-screen overflow-hidden p-1">
            {/* Background */}
            <div className="fixed inset-0 mesh-bg opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="orb w-[400px] h-[400px] bg-accent/15 top-[-100px] right-[-100px]" />
            <div className="orb w-[300px] h-[300px] bg-purple/10 bottom-[100px] left-[-50px]" style={{ animationDelay: "-5s" }} />

            <div className="relative z-10 space-y-8 animate-page-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-text tracking-tight">
                            {getGreeting()}, {user?.name?.split(" ")[0] || "Admin"}
                        </h1>
                        <p className="text-md text-text-3 mt-1 font-medium">Payroll Administrator</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/payroll">
                            <Button size="sm">Manage Payroll</Button>
                        </Link>
                        <Link href="/admin/reports">
                            <Button variant="secondary" size="sm">View Reports</Button>
                        </Link>
                    </div>
                </div>

                {/* Personal Stats */}
                {data?.stats && (
                    <>
                        <div>
                            <h2 className="text-xs font-bold text-text-3 uppercase tracking-wider mb-4">My Overview</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {loading ? (
                                    Array(4).fill(0).map((_, i) => (
                                        <div key={i} className="bg-surface border border-border rounded-xl p-5 h-[140px] animate-pulse" />
                                    ))
                                ) : (
                                    <>
                                        <DashboardStatCard label="Attendance" value={String(data.stats.attendanceCount || 0)} sub="Days present this month" badge="Live" badgeType="up" icon={<ClockIcon className="w-5 h-5" />} />
                                        <DashboardStatCard label="Leave Balance" value={String(data.stats.leavesUsed || 0)} sub="Leaves used" badge="Yearly" badgeType="neutral" icon={<CalendarIcon className="w-5 h-5" />} />
                                        <DashboardStatCard label="Pending Training" value={String(data.stats.pendingTrainingCount || 0)} sub="Assigned modules"
                                            badge={data.stats.pendingTrainingCount > 0 ? "Priority" : "Done"}
                                            badgeType={data.stats.pendingTrainingCount > 0 ? "down" : "up"}
                                            icon={<BackpackIcon className="w-5 h-5" />} />
                                        <DashboardStatCard label="Review Status" value={data.stats.reviewStatus || "Upcoming"} sub="Next evaluation" badge="Q1" badgeType="neutral" icon={<span className="text-lg">📊</span>} />
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Payroll Operations */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-border" />
                        <h2 className="text-xs font-bold text-text-3 uppercase tracking-wider shrink-0">Payroll Operations</h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="bg-surface border border-border rounded-xl p-5 h-[140px] animate-pulse" />
                            ))
                        ) : (
                            <>
                                <DashboardStatCard
                                    label="Total Payout"
                                    value={formatCurrency(payrollStats?.totalPayout || 0)}
                                    sub="This month's net disbursement"
                                    badge="Current"
                                    badgeType="up"
                                    icon={<span className="text-lg">💰</span>}
                                    isMoney
                                />
                                <DashboardStatCard
                                    label="Pending Payrolls"
                                    value={String(payrollStats?.pendingCount || 0)}
                                    sub={`of ${payrollStats?.totalEmployees || 0} active employees`}
                                    badge={(payrollStats?.pendingCount || 0) > 0 ? "Action" : "Clear"}
                                    badgeType={(payrollStats?.pendingCount || 0) > 0 ? "down" : "up"}
                                    icon={<span className="text-lg">📋</span>}
                                />
                                <DashboardStatCard
                                    label="PF This Month"
                                    value={formatCurrency(pfStats?.totalPFThisMonth || 0)}
                                    sub={`${pfStats?.pfRecordCount || 0} records filed`}
                                    badge="PF"
                                    badgeType="neutral"
                                    icon={<span className="text-lg">🏦</span>}
                                    isMoney
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Payroll Status Breakdown + Time Tracker + Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                    <div className="space-y-6">
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                            <RocketIcon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-lg">Payroll Status Breakdown</CardTitle>
                                    </div>
                                    <Badge variant="neutral" size="sm">{payrollStats?.totalEmployees || 0} employees</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Spinner size="lg" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <DeptRow
                                            name="Pending"
                                            count={payrollStats?.pendingCount || 0}
                                            pct={pendingPct}
                                            color="#f59e0b"
                                        />
                                        <DeptRow
                                            name="Processed"
                                            count={payrollStats?.processedCount || 0}
                                            pct={processedPct}
                                            color="#3b82f6"
                                        />
                                        <DeptRow
                                            name="Paid"
                                            count={payrollStats?.paidCount || 0}
                                            pct={paidPct}
                                            color="#10b981"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <TimeTracker />

                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <Link href="/payroll" className="block">
                                        <Button variant="primary" className="w-full justify-start gap-3">
                                            <span className="text-lg">💳</span>
                                            Run Payroll
                                        </Button>
                                    </Link>
                                    <Link href="/payroll" className="block">
                                        <Button variant="secondary" className="w-full justify-start gap-3">
                                            <span className="text-lg">📊</span>
                                            Manage PF
                                        </Button>
                                    </Link>
                                    <Link href="/admin/reports" className="block">
                                        <Button variant="secondary" className="w-full justify-start gap-3">
                                            <span className="text-lg">📥</span>
                                            Export Reports
                                        </Button>
                                    </Link>
                                    <Link href="/leave" className="block">
                                        <Button variant="ghost" className="w-full justify-start gap-3">
                                            <span className="text-lg">🏖️</span>
                                            View Leaves
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
