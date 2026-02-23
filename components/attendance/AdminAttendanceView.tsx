"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import { format } from "date-fns"

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "WEEKEND"

interface AttendanceEmployee {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
}

interface AttendanceRecord {
    id: string
    date: string
    checkIn: string | null
    checkOut: string | null
    workHours: number | null
    status: AttendanceStatus
    employeeId: string
    employee: AttendanceEmployee
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

const STATUS_ICONS: Record<AttendanceStatus, string> = {
    PRESENT: "✓",
    ABSENT: "✕",
    HALF_DAY: "⏰",
    ON_LEAVE: "📋",
    WEEKEND: "—",
}

const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()

const fmtTime = (iso: string | null) => {
    if (!iso) return "—"
    return format(new Date(iso), "hh:mm a")
}

export function AdminAttendanceView() {
    const [records, setRecords] = React.useState<AttendanceRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [filter, setFilter] = React.useState<"ALL" | AttendanceStatus>("ALL")

    const fetchRecords = React.useCallback(async () => {
        try {
            const res = await fetch("/api/attendance")
            if (!res.ok) throw new Error("Failed to fetch")
            setRecords(await res.json())
        } catch {
            toast.error("Failed to load attendance records")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    const filtered = filter === "ALL" ? records : records.filter(r => r.status === filter)

    const presentCount = records.filter(r => r.status === "PRESENT").length
    const absentCount = records.filter(r => r.status === "ABSENT").length
    const halfDayCount = records.filter(r => r.status === "HALF_DAY").length
    const totalHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0)

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Attendance Tracking</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track daily attendance and work hours</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Present</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140]">{loading ? "—" : presentCount}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">&#9989;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--green,#22c55e)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Absent</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--red,#ef4444)]">{loading ? "—" : absentCount}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,59,48,0.1)] shrink-0">&#10060;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--red,#ef4444)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Half Day</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber,#f59e0b)]">{loading ? "—" : halfDayCount}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,149,0,0.12)] shrink-0">&#9200;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--amber,#f59e0b)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Total Hours</div>
                        <div className="text-[30px] font-extrabold leading-[1] tracking-[-1px] text-[#0a7ea4]">{loading ? "—" : totalHours.toFixed(1)}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--blue-dim)] shrink-0">&#9201;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--blue,#3b82f6)] to-transparent" />
                </div>
            </div>

            <div className="flex items-center gap-[12px] mb-[18px]">
                <select
                    className="p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] cursor-pointer outline-none transition-all duration-200 shadow-sm hover:border-[var(--border2)]"
                    value={filter}
                    onChange={e => setFilter(e.target.value as any)}
                >
                    <option value="ALL">All Status</option>
                    {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                </select>
                <span className="text-[12.5px] text-[var(--text3)]">Showing {filtered.length} of {records.length} records</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading attendance records...</div>
            ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r,12px)] overflow-hidden shadow-sm mb-5">
                    <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                        <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">Attendance Records</div>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                                {["Employee", "Date", "Check In", "Check Out", "Work Hours", "Status"].map(h => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-[var(--text3)] text-[13px]">No records found.</td></tr>
                            ) : filtered.map((rec, i) => (
                                <tr key={rec.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.03}s` }}>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                        <div className="flex items-center gap-[11px]">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br from-[#007aff] to-[#5856d6]">
                                                {getInitials(rec.employee.firstName, rec.employee.lastName)}
                                            </div>
                                            <span className="font-semibold">{rec.employee.firstName} {rec.employee.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className="inline-block px-[10px] py-[3px] border border-[var(--border)] rounded-[6px] text-[12px] text-[var(--text3)] bg-[var(--bg)] font-mono">
                                            {format(new Date(rec.date), "MMM d, yyyy")}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px] text-[13px] text-[var(--text)] font-mono">
                                        <div className="flex items-center gap-[6px]">
                                            <span className="text-[var(--green,#22c55e)] text-[10px]">&#9679;</span> {fmtTime(rec.checkIn)}
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px] text-[13px] text-[var(--text)] font-mono">
                                        <div className="flex items-center gap-[6px]">
                                            <span className="text-[var(--red,#ef4444)] text-[10px]">&#9679;</span> {fmtTime(rec.checkOut)}
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className="font-bold text-[var(--accent)] font-mono">{rec.workHours != null ? `${rec.workHours.toFixed(1)}h` : "—"}</span>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border", STATUS_STYLES[rec.status])}>
                                            {STATUS_ICONS[rec.status]} {STATUS_LABELS[rec.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="glass p-[22px]">
                <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center gap-2 mb-[16px]">
                    Attendance Policy
                </div>
                <div className="flex flex-col gap-[12px]">
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--green,#22c55e)] shadow-[0_0_6px_var(--green,#22c55e)]" />
                        Standard work hours: 9 hours per day (with 1 hour break)
                    </div>
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--amber,#f59e0b)] shadow-[0_0_6px_var(--amber,#f59e0b)]" />
                        Half-day: Less than 5 hours of work
                    </div>
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                        Overtime: Work hours beyond 9 hours will be compensated
                    </div>
                </div>
            </div>
        </div>
    )
}
