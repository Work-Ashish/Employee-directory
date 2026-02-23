"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ClockIcon, CalendarIcon } from "@radix-ui/react-icons"
import toast from "react-hot-toast"
import { format, differenceInHours, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns"

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "WEEKEND"

interface AttendanceRecord {
    id: string
    date: string
    checkIn: string | null
    checkOut: string | null
    workHours: number | null
    status: AttendanceStatus
    createdAt: string
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    HALF_DAY: "Half Day",
    ON_LEAVE: "On Leave",
    WEEKEND: "Weekend",
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
    PRESENT: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]",
    ABSENT: "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.25)]",
    HALF_DAY: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]",
    ON_LEAVE: "bg-[var(--blue-dim)] text-[#0a7ea4] border-[rgba(0,122,255,0.25)]",
    WEEKEND: "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]",
}

const fmtTime = (iso: string | null) => {
    if (!iso) return "—"
    return format(new Date(iso), "hh:mm a")
}

export function EmployeeAttendanceView() {
    const [records, setRecords] = React.useState<AttendanceRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [todayRecord, setTodayRecord] = React.useState<AttendanceRecord | null>(null)
    const [checking, setChecking] = React.useState(false)

    const fetchRecords = React.useCallback(async () => {
        try {
            const res = await fetch("/api/attendance")
            if (!res.ok) throw new Error("Failed to fetch")
            const data: AttendanceRecord[] = await res.json()
            setRecords(data)

            const todayStr = format(new Date(), "yyyy-MM-dd")
            const today = data.find(r => format(new Date(r.date), "yyyy-MM-dd") === todayStr)
            setTodayRecord(today || null)
        } catch {
            toast.error("Failed to load attendance")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    const handleCheckIn = async () => {
        setChecking(true)
        try {
            const now = new Date()
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: now.toISOString(),
                    checkIn: now.toISOString(),
                    status: "PRESENT",
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to check in")
            }
            toast.success("Checked in successfully!")
            fetchRecords()
        } catch (error: any) {
            toast.error(error.message || "Check-in failed")
        } finally {
            setChecking(false)
        }
    }

    const handleCheckOut = async () => {
        if (!todayRecord) return
        setChecking(true)
        try {
            const now = new Date()
            const checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : now
            const hours = differenceInMinutes(now, checkInTime) / 60
            const status: AttendanceStatus = hours < 5 ? "HALF_DAY" : "PRESENT"

            const res = await fetch(`/api/attendance/${todayRecord.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    checkOut: now.toISOString(),
                    workHours: parseFloat(hours.toFixed(2)),
                    status,
                }),
            })
            if (!res.ok) throw new Error("Failed to check out")
            toast.success("Checked out successfully!")
            fetchRecords()
        } catch {
            toast.error("Check-out failed")
        } finally {
            setChecking(false)
        }
    }

    const monthRecords = records.filter(r => {
        const d = new Date(r.date)
        const now = new Date()
        return d >= startOfMonth(now) && d <= endOfMonth(now)
    })

    const totalHours = monthRecords.reduce((sum, r) => sum + (r.workHours || 0), 0)
    const presentDays = monthRecords.filter(r => r.status === "PRESENT" || r.status === "HALF_DAY").length
    const totalDays = monthRecords.length || 1
    const attendancePct = Math.round((presentDays / totalDays) * 100)

    const avgCheckIn = (() => {
        const checkIns = monthRecords.filter(r => r.checkIn).map(r => new Date(r.checkIn!))
        if (checkIns.length === 0) return "—"
        const avgMs = checkIns.reduce((sum, d) => sum + (d.getHours() * 60 + d.getMinutes()), 0) / checkIns.length
        const h = Math.floor(avgMs / 60)
        const m = Math.round(avgMs % 60)
        const period = h >= 12 ? "PM" : "AM"
        const h12 = h % 12 || 12
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`
    })()

    const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Attendance</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track your daily logs and work hours</p>
                </div>
                {!loading && (
                    <div>
                        {!todayRecord ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={checking}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#1a9140] text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-green-500/20 disabled:opacity-50"
                            >
                                <ClockIcon className="w-4 h-4" /> {checking ? "Checking in..." : "Check In"}
                            </button>
                        ) : isCheckedIn ? (
                            <button
                                onClick={handleCheckOut}
                                disabled={checking}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--red,#ef4444)] text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                <ClockIcon className="w-4 h-4" /> {checking ? "Checking out..." : "Check Out"}
                            </button>
                        ) : (
                            <span className="text-[13px] text-[var(--text3)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-[10px]">
                                ✓ Day completed &bull; {todayRecord.workHours?.toFixed(1)}h logged
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase">Avg Check-in</div>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <ClockIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)]">{loading ? "—" : avgCheckIn}</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">This month</div>
                </div>

                <div className="glass p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase">Work Hours</div>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <span className="font-bold text-[13px]">H</span>
                        </div>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)]">{loading ? "—" : `${totalHours.toFixed(0)}h`}</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">This month</div>
                </div>

                <div className="glass p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase">Attendance</div>
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)]">{loading ? "—" : `${attendancePct}%`}</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">{presentDays} of {totalDays} days</div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading attendance logs...</div>
            ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r,12px)] overflow-hidden shadow-sm">
                    <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                        <div className="text-[14px] font-bold text-[var(--text)]">My Logs</div>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                                {["Date", "Check In", "Check Out", "Hours", "Status"].map(h => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-[var(--text3)] text-[13px]">No attendance records yet.</td></tr>
                            ) : records.map((rec) => (
                                <tr key={rec.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0">
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{format(new Date(rec.date), "MMM d, yyyy")}</td>
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">
                                        <div className="flex items-center gap-[6px]">
                                            <span className="text-[var(--green,#22c55e)] text-[10px]">&#9679;</span> {fmtTime(rec.checkIn)}
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">
                                        <div className="flex items-center gap-[6px]">
                                            <span className="text-[var(--red,#ef4444)] text-[10px]">&#9679;</span> {fmtTime(rec.checkOut)}
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px] font-bold text-[var(--accent)]">{rec.workHours != null ? `${rec.workHours.toFixed(1)}h` : "—"}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border", STATUS_STYLES[rec.status])}>
                                            {rec.status === "PRESENT" ? "✓" : rec.status === "ABSENT" ? "✕" : "⏰"} {STATUS_LABELS[rec.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
