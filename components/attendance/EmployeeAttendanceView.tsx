"use client"

import * as React from "react"
import { ClockIcon, CalendarIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"
import { AttendanceAPI } from "@/features/attendance/api/client"
import { useAuth } from "@/context/AuthContext"

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "WEEKEND"

interface AttendanceRecord {
    id: string
    date: string
    checkIn: string | null
    checkOut: string | null
    workHours: number | null
    status: AttendanceStatus
    employee: string
    employeeName: string
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

const fmtTime = (iso: string | null) => {
    if (!iso) return "\u2014"
    return format(new Date(iso), "hh:mm a")
}

export function EmployeeAttendanceView() {
    const { user } = useAuth()
    const [records, setRecords] = React.useState<AttendanceRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [todayRecord, setTodayRecord] = React.useState<AttendanceRecord | null>(null)
    const [checking, setChecking] = React.useState(false)
    const [tab, setTab] = React.useState<"mine" | "team">("mine")

    // The logged-in user's employee ID (from auth context)
    const myEmployeeId = user?.employeeId || ""

    const fetchRecords = React.useCallback(async () => {
        try {
            const response = await AttendanceAPI.list()
            const data = (response.results || []).map((r: any) => ({
                ...r,
                status: (r.status || "").toUpperCase().replace(/ /g, "_"),
                employee: typeof r.employee === "object" ? r.employee.id || r.employee : r.employee,
                employeeName: r.employeeName || "",
            })) as AttendanceRecord[]
            setRecords(data)

            const todayStr = format(new Date(), "yyyy-MM-dd")
            const today = data.find(
                (r) => r.employee === myEmployeeId && format(new Date(r.date), "yyyy-MM-dd") === todayStr,
            )
            setTodayRecord(today || null)
        } catch {
            toast.error("Failed to load attendance")
        } finally {
            setLoading(false)
        }
    }, [myEmployeeId])

    React.useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    const handleCheckIn = async () => {
        setChecking(true)
        try {
            const now = new Date()
            await AttendanceAPI.create({
                date: now.toISOString(),
                checkIn: now.toISOString(),
                status: "PRESENT",
            })
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

            await AttendanceAPI.update(todayRecord.id, {
                checkOut: now.toISOString(),
                workHours: parseFloat(hours.toFixed(2)),
                status,
            })
            toast.success("Checked out successfully!")
            fetchRecords()
        } catch {
            toast.error("Check-out failed")
        } finally {
            setChecking(false)
        }
    }

    // Split records: mine vs team
    const myRecords = records.filter((r) => r.employee === myEmployeeId)
    const teamRecords = records.filter((r) => r.employee !== myEmployeeId)
    const hasTeamRecords = teamRecords.length > 0

    const displayRecords = tab === "mine" ? myRecords : teamRecords

    // Stats from own records this month
    const monthRecords = myRecords.filter((r) => {
        const d = new Date(r.date)
        const now = new Date()
        return d >= startOfMonth(now) && d <= endOfMonth(now)
    })

    const totalHours = monthRecords.reduce((sum, r) => sum + (r.workHours || 0), 0)
    const presentDays = monthRecords.filter((r) => r.status === "PRESENT" || r.status === "HALF_DAY").length
    const totalDays = monthRecords.length || 1
    const attendancePct = Math.round((presentDays / totalDays) * 100)

    const avgCheckIn = (() => {
        const checkIns = monthRecords.filter((r) => r.checkIn).map((r) => new Date(r.checkIn!))
        if (checkIns.length === 0) return "\u2014"
        const avgMs = checkIns.reduce((sum, d) => sum + (d.getHours() * 60 + d.getMinutes()), 0) / checkIns.length
        const h = Math.floor(avgMs / 60)
        const m = Math.round(avgMs % 60)
        const period = h >= 12 ? "PM" : "AM"
        const h12 = h % 12 || 12
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`
    })()

    const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut

    const headerActions = !loading ? (
        <>
            {!todayRecord ? (
                <Button
                    variant="success"
                    onClick={handleCheckIn}
                    loading={checking}
                    leftIcon={<ClockIcon className="w-4 h-4" />}
                >
                    Check In
                </Button>
            ) : isCheckedIn ? (
                <Button
                    variant="danger"
                    onClick={handleCheckOut}
                    loading={checking}
                    leftIcon={<ClockIcon className="w-4 h-4" />}
                >
                    Check Out
                </Button>
            ) : (
                <Badge variant="neutral" size="lg">
                    {"\u2713"} Day completed &bull; {todayRecord.workHours?.toFixed(1)}h logged
                </Badge>
            )}
        </>
    ) : undefined

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="My Attendance"
                description="Track your daily logs and work hours"
                actions={headerActions}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label="Avg Check-in"
                    value={loading ? "\u2014" : avgCheckIn}
                    icon={<ClockIcon className="w-4 h-4" />}
                    change={{ value: "This month", positive: true }}
                />
                <StatCard
                    label="Work Hours"
                    value={loading ? "\u2014" : `${totalHours.toFixed(0)}h`}
                    icon={<span className="font-bold text-sm">H</span>}
                    change={{ value: "This month", positive: true }}
                />
                <StatCard
                    label="Attendance"
                    value={loading ? "\u2014" : `${attendancePct}%`}
                    icon={<CalendarIcon className="w-4 h-4" />}
                    change={{ value: `${presentDays} of ${totalDays} days`, positive: true }}
                />
            </div>

            {/* Tabs: My Logs / Team Attendance (only if manager has team records) */}
            {hasTeamRecords && (
                <div className="flex gap-1 p-1 bg-bg-2 rounded-lg w-fit">
                    <button
                        onClick={() => setTab("mine")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            tab === "mine"
                                ? "bg-surface text-text shadow-sm"
                                : "text-text-3 hover:text-text"
                        }`}
                    >
                        My Logs ({myRecords.length})
                    </button>
                    <button
                        onClick={() => setTab("team")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            tab === "team"
                                ? "bg-surface text-text shadow-sm"
                                : "text-text-3 hover:text-text"
                        }`}
                    >
                        Team Attendance ({teamRecords.length})
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-text-3">
                    <Spinner size="lg" />
                    <span className="text-sm">Loading attendance logs...</span>
                </div>
            ) : (
                <Card>
                    <CardHeader className="flex-row items-center justify-between pb-0">
                        <CardTitle>{tab === "mine" ? "My Logs" : "Team Attendance"}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-bg-2">
                                    {(tab === "team" ? ["Employee", "Date", "Check In", "Check Out", "Hours", "Status"] : ["Date", "Check In", "Check Out", "Hours", "Status"]).map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={tab === "team" ? 6 : 5}>
                                            <EmptyState
                                                title={tab === "mine" ? "No attendance records yet" : "No team records found"}
                                                description={tab === "mine" ? "Your attendance logs will appear here once you start checking in." : "Your team members' attendance will appear here."}
                                            />
                                        </td>
                                    </tr>
                                ) : displayRecords.map((rec) => (
                                    <tr key={rec.id} className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border last:border-0">
                                        {tab === "team" && (
                                            <td className="px-4 py-3 text-sm text-text">
                                                <div className="flex items-center gap-2">
                                                    <Avatar name={rec.employeeName || "?"} size="xs" />
                                                    <span className="font-medium truncate">{rec.employeeName || "Unknown"}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-mono text-sm text-text">{format(new Date(rec.date), "MMM d, yyyy")}</td>
                                        <td className="px-4 py-3 font-mono text-sm text-text">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-success text-[10px]">&#9679;</span> {fmtTime(rec.checkIn)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm text-text">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-danger text-[10px]">&#9679;</span> {fmtTime(rec.checkOut)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-accent">{rec.workHours != null ? `${rec.workHours.toFixed(1)}h` : "\u2014"}</td>
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
        </div>
    )
}
