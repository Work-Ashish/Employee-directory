"use client"

import * as React from "react"
import { extractArray } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { hasPermission, Module, Action } from "@/lib/permissions"
import { format } from "date-fns"
import { CsvImportModal } from "@/components/ui/CsvImportModal"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

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

const STATUS_BADGE_VARIANT: Record<AttendanceStatus, "success" | "danger" | "warning" | "info" | "neutral"> = {
    PRESENT: "success",
    ABSENT: "danger",
    HALF_DAY: "warning",
    ON_LEAVE: "info",
    WEEKEND: "neutral",
}

const STATUS_ICONS: Record<AttendanceStatus, string> = {
    PRESENT: "\u2713",
    ABSENT: "\u2715",
    HALF_DAY: "\u23F0",
    ON_LEAVE: "\uD83D\uDCCB",
    WEEKEND: "\u2014",
}

const fmtTime = (iso: string | null) => {
    if (!iso) return "\u2014"
    return format(new Date(iso), "hh:mm a")
}

const FILTER_OPTIONS = [
    { value: "ALL", label: "All Status" },
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "HALF_DAY", label: "Half Day" },
    { value: "ON_LEAVE", label: "On Leave" },
    { value: "WEEKEND", label: "Weekend" },
]

export function AdminAttendanceView() {
    const { user } = useAuth()
    const canEdit = hasPermission(user?.role ?? '', Module.ATTENDANCE, Action.UPDATE)
    const [records, setRecords] = React.useState<AttendanceRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [filter, setFilter] = React.useState<"ALL" | AttendanceStatus>("ALL")
    const [isImportOpen, setIsImportOpen] = React.useState(false)

    const fetchRecords = React.useCallback(async () => {
        try {
            const res = await fetch("/api/attendance")
            if (!res.ok) throw new Error("Failed to fetch")
            const data = await res.json()
            setRecords(extractArray<AttendanceRecord>(data))
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
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Attendance Tracking"
                description="Track daily attendance and work hours"
                actions={canEdit ? (
                    <Button
                        variant="secondary"
                        onClick={() => setIsImportOpen(true)}
                    >
                        Import CSV
                    </Button>
                ) : undefined}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Present"
                    value={loading ? "\u2014" : presentCount}
                    icon={<span className="text-success text-lg">{"\u2705"}</span>}
                />
                <StatCard
                    label="Absent"
                    value={loading ? "\u2014" : absentCount}
                    icon={<span className="text-danger text-lg">{"\u274C"}</span>}
                />
                <StatCard
                    label="Half Day"
                    value={loading ? "\u2014" : halfDayCount}
                    icon={<span className="text-warning text-lg">{"\u23F0"}</span>}
                />
                <StatCard
                    label="Total Hours"
                    value={loading ? "\u2014" : `${totalHours.toFixed(1)}h`}
                    icon={<span className="text-info text-lg">{"\u23F1"}</span>}
                />
            </div>

            <div className="flex items-center gap-3">
                <Select
                    value={filter}
                    onChange={e => setFilter(e.target.value as any)}
                    options={FILTER_OPTIONS}
                    className="w-44"
                />
                <span className="text-xs text-text-3">Showing {filtered.length} of {records.length} records</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-text-3">
                    <Spinner size="lg" />
                    <span className="text-sm">Loading attendance records...</span>
                </div>
            ) : (
                <Card>
                    <CardHeader className="flex-row items-center justify-between pb-0">
                        <CardTitle>Attendance Records</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-bg-2">
                                    {["Employee", "Date", "Check In", "Check Out", "Work Hours", "Status"].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <EmptyState
                                                title="No records found"
                                                description="No attendance records match the current filter."
                                            />
                                        </td>
                                    </tr>
                                ) : filtered.map((rec, i) => (
                                    <tr
                                        key={rec.id}
                                        className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border last:border-0 animate-[fadeRow_0.3s_both]"
                                        style={{ animationDelay: `${i * 0.03}s` }}
                                    >
                                        <td className="px-4 py-3 text-base text-text">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    name={`${rec.employee.firstName} ${rec.employee.lastName}`}
                                                    size="default"
                                                />
                                                <span className="font-semibold">{rec.employee.firstName} {rec.employee.lastName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="neutral" size="sm">
                                                <span className="font-mono">{format(new Date(rec.date), "MMM d, yyyy")}</span>
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text font-mono">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-success text-[10px]">&#9679;</span> {fmtTime(rec.checkIn)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text font-mono">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-danger text-[10px]">&#9679;</span> {fmtTime(rec.checkOut)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-accent font-mono">{rec.workHours != null ? `${rec.workHours.toFixed(1)}h` : "\u2014"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={STATUS_BADGE_VARIANT[rec.status]} dot>
                                                {STATUS_LABELS[rec.status]}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            <Card variant="glass" className="p-5">
                <div className="text-base font-bold text-text flex items-center gap-2 mb-4">
                    Attendance Policy
                </div>
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2.5 text-base text-text-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-success shadow-[0_0_6px_var(--success)]" />
                        Standard work hours: 9 hours per day (with 1 hour break)
                    </div>
                    <div className="flex items-start gap-2.5 text-base text-text-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-warning shadow-[0_0_6px_var(--warning)]" />
                        Half-day: Less than 5 hours of work
                    </div>
                    <div className="flex items-start gap-2.5 text-base text-text-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-accent shadow-[0_0_6px_var(--accent)]" />
                        Overtime: Work hours beyond 9 hours will be compensated
                    </div>
                </div>
            </Card>

            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                title="Attendance Records"
                templateHeaders={["employeeCode", "date", "checkIn", "checkOut", "workHours", "status"]}
                apiEndpoint="/api/attendance/import"
                onSuccess={fetchRecords}
            />
        </div>
    )
}
