"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

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
        fetch("/api/admin/time-tracker/dashboard")
            .then(r => r.ok ? r.json() : null)
            .then(setData)
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
                <div className="animate-spin w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!data) {
        return <p className="text-center text-[var(--text3)] py-12">Failed to load dashboard.</p>
    }

    const filtered = filter === "all" ? data.employees : data.employees.filter(e => e.currentStatus === filter)

    return (
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-extrabold text-[var(--text)] tracking-tight">Activity Monitor</h1>
                    <p className="text-[13px] text-[var(--text3)] mt-0.5">Real-time employee tracking dashboard</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text4)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
                    Live · Refreshes every 30s
                </div>
            </div>

            {/* ═══ Summary Cards ═══ */}
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
                                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg2)]"
                        )}
                    >
                        <div className="text-[24px] font-extrabold" style={{ color: card.color }}>{card.count}</div>
                        <div className="text-[12px] text-[var(--text3)] font-medium mt-1">{card.label}</div>
                    </button>
                ))}
            </div>

            {/* ═══ Employee Grid ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(emp => {
                    const sc = STATUS_CONFIG[emp.currentStatus]
                    const initials = emp.name.split(" ").map(n => n[0]).join("").toUpperCase()

                    return (
                        <div key={emp.id} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 hover:border-[var(--accent)]/30 transition-colors">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-[13px] font-bold text-white">
                                        {emp.avatarUrl ? <img src={emp.avatarUrl} className="w-full h-full object-cover rounded-full" /> : initials}
                                    </div>
                                    {/* Status dot */}
                                    <span
                                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)]"
                                        style={{ backgroundColor: sc.color }}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold text-[var(--text)] truncate">{emp.name}</div>
                                    <div className="text-[11px] text-[var(--text3)]">{emp.designation} · {emp.department}</div>
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
                                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                                    <div className="text-[var(--text3)]">
                                        {emp.currentApp && (
                                            <span className="font-medium text-[var(--text)]">📱 {emp.currentApp}</span>
                                        )}
                                    </div>
                                    <div className="text-[var(--text4)]">
                                        Since {emp.checkInTime ? fmtTime(emp.checkInTime) : "—"}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-[var(--text3)]">
                    No employees match the selected filter.
                </div>
            )}
        </div>
    )
}
