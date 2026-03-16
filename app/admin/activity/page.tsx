"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import { EmptyState } from "@/components/ui/EmptyState"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { api } from "@/lib/api-client"

interface EmployeeStatus {
    id: string
    name: string
    designation: string
    employeeCode: string
    department: string
    avatarUrl: string | null
    currentStatus: "online" | "idle" | "break" | "offline"
    currentApp: string | null
    checkInTime: string | null
    totalWorkToday: number
}

interface DashboardData {
    employees: EmployeeStatus[]
    summary: { online: number; idle: number; onBreak: number; offline: number; total: number }
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
const fmtDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${m.toString().padStart(2, "0")}m`
}

const STATUS_CONFIG = {
    online: { label: "Active", color: "#34c759", bg: "rgba(52,199,89,0.1)", border: "rgba(52,199,89,0.2)", icon: "🟢" },
    idle: { label: "Idle", color: "#ff9500", bg: "rgba(255,149,0,0.1)", border: "rgba(255,149,0,0.2)", icon: "🟡" },
    break: { label: "Break", color: "#ff3b30", bg: "rgba(255,59,48,0.1)", border: "rgba(255,59,48,0.2)", icon: "🔴" },
    offline: { label: "Offline", color: "#8e8e93", bg: "rgba(142,142,147,0.1)", border: "rgba(142,142,147,0.2)", icon: "⚫" },
}

export default function ActivityDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("all")

    const fetchData = () => {
        api.get<DashboardData>('/time-tracker/dashboard/')
            .then(({ data }) => setData(data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30_000) // refresh every 30s
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Spinner size="lg" className="text-accent" />
            </div>
        )
    }

    if (!data || !data.employees) {
        return <EmptyState title="No activity data available" className="py-12" />
    }

    const filtered = filter === "all" ? data.employees : data.employees.filter(e => e.currentStatus === filter)

    return (
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
            {/* Header */}
            <PageHeader
                title="Activity Monitor"
                description="Real-time employee tracking dashboard"
                actions={
                    <div className="flex items-center gap-2 text-xs text-text-4">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        Live · Refreshes every 30s
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { key: "all", label: "Total", count: data.summary.total, color: "var(--accent)" },
                    { key: "online", label: "Active", count: data.summary.online, color: "#34c759" },
                    { key: "idle", label: "Idle", count: data.summary.idle, color: "#ff9500" },
                    { key: "break", label: "On Break", count: data.summary.onBreak, color: "#ff3b30" },
                    { key: "offline", label: "Offline", count: data.summary.offline, color: "#8e8e93" },
                ].map(card => (
                    <button
                        key={card.key}
                        onClick={() => setFilter(card.key)}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-all",
                            filter === card.key
                                ? "border-accent bg-accent/5"
                                : "border-border bg-surface hover:bg-bg-2"
                        )}
                    >
                        <div className="text-2xl font-extrabold" style={{ color: card.color }}>{card.count}</div>
                        <div className="text-sm text-text-3 font-medium mt-1">{card.label}</div>
                    </button>
                ))}
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(emp => {
                    const sc = STATUS_CONFIG[emp.currentStatus]

                    return (
                        <div key={emp.id} className="bg-surface rounded-xl border border-border p-4 hover:border-accent/30 transition-colors">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative">
                                    <Avatar src={emp.avatarUrl} name={emp.name} size="lg" />
                                    {/* Status dot */}
                                    <span
                                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface"
                                        style={{ backgroundColor: sc.color }}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-base font-semibold text-text truncate">{emp.name}</div>
                                    <div className="text-xs text-text-3">{emp.designation} · {emp.department}</div>
                                </div>

                                {/* Status badge */}
                                <span
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0"
                                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                                >
                                    {sc.label}
                                </span>
                            </div>

                            {/* Details */}
                            {emp.currentStatus !== "offline" && (
                                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                                    <div className="text-text-3">
                                        {emp.currentApp && (
                                            <span className="font-medium text-text">📱 {emp.currentApp}</span>
                                        )}
                                    </div>
                                    <div className="text-text-4">
                                        Since {emp.checkInTime ? fmtTime(emp.checkInTime) : "—"}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {filtered.length === 0 && (
                <EmptyState title="No employees match the selected filter" className="py-12" />
            )}
        </div>
    )
}
