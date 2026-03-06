"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { format, differenceInCalendarDays } from "date-fns"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

type LeaveType = "CASUAL" | "SICK" | "EARNED" | "MATERNITY" | "PATERNITY" | "UNPAID"
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

interface LeaveEmployee {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
}

interface LeaveRequest {
    id: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string | null
    status: LeaveStatus
    employeeId: string
    employee: LeaveEmployee
    createdAt: string
}

const TYPE_LABELS: Record<LeaveType, string> = {
    CASUAL: "Casual",
    SICK: "Sick",
    EARNED: "Earned",
    MATERNITY: "Maternity",
    PATERNITY: "Paternity",
    UNPAID: "Unpaid",
}

const TYPE_BADGE_VARIANT: Record<LeaveType, "info" | "danger" | "success" | "purple" | "default" | "neutral"> = {
    CASUAL: "info",
    SICK: "danger",
    EARNED: "success",
    MATERNITY: "purple",
    PATERNITY: "default",
    UNPAID: "neutral",
}

const STATUS_LABELS: Record<LeaveStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
}

const STATUS_BADGE_VARIANT: Record<LeaveStatus, "warning" | "success" | "danger"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "danger",
}

const getDays = (start: string, end: string) =>
    differenceInCalendarDays(new Date(end), new Date(start)) + 1

const LEAVE_TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as LeaveType[]).map(t => ({
    value: t,
    label: TYPE_LABELS[t],
}))

const STATUS_FILTER_OPTIONS = [
    { value: "ALL", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
]

export function AdminLeaveView() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const page = parseInt(searchParams?.get("page") || "1", 10)
    const limit = parseInt(searchParams?.get("limit") || "15", 10)

    const [leaves, setLeaves] = React.useState<LeaveRequest[]>([])
    const [totalRows, setTotalRows] = React.useState(0)
    const [pageCount, setPageCount] = React.useState(1)

    const [loading, setLoading] = React.useState(true)
    const [filter, setFilter] = React.useState<"ALL" | LeaveStatus>("ALL")
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [formData, setFormData] = React.useState({
        type: "CASUAL" as LeaveType,
        startDate: "",
        endDate: "",
        reason: "",
        employeeId: "",
    })
    const [saving, setSaving] = React.useState(false)

    const fetchLeaves = React.useCallback(async () => {
        try {
            const res = await fetch(`/api/leaves?page=${page}&limit=${limit}`)
            if (!res.ok) throw new Error("Failed to fetch")
            const json = await res.json()
            const data = Array.isArray(json) ? json : (json.data || [])
            setLeaves(data)

            if (json.total !== undefined) {
                setTotalRows(json.total)
                setPageCount(Math.ceil(json.total / limit))
            }
        } catch {
            toast.error("Failed to load leave requests")
        } finally {
            setLoading(false)
        }
    }, [page, limit])

    React.useEffect(() => {
        fetchLeaves()
    }, [fetchLeaves])

    const handleAction = async (id: string, status: LeaveStatus) => {
        try {
            const res = await fetch(`/api/leaves/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })
            if (!res.ok) throw new Error("Failed to update")
            toast.success(`Leave ${STATUS_LABELS[status].toLowerCase()}`)
            fetchLeaves()
        } catch {
            toast.error("Failed to update leave request")
        }
    }

    const handleCreate = async () => {
        if (!formData.employeeId || !formData.startDate || !formData.endDate) {
            toast.error("Employee ID, start date, and end date are required")
            return
        }
        setSaving(true)
        try {
            const res = await fetch("/api/leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to create")
            }
            toast.success("Leave request created")
            setIsModalOpen(false)
            setFormData({ type: "CASUAL", startDate: "", endDate: "", reason: "", employeeId: "" })
            fetchLeaves()
        } catch (error: any) {
            toast.error(error.message || "Failed to create leave request")
        } finally {
            setSaving(false)
        }
    }

    const filtered = filter === "ALL" ? leaves : leaves.filter(l => l.status === filter)
    const pendingCount = leaves.filter(l => l.status === "PENDING").length
    const approvedCount = leaves.filter(l => l.status === "APPROVED").length
    const rejectedCount = leaves.filter(l => l.status === "REJECTED").length

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Leave Management"
                description="Review and approve employee leave requests"
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <StatCard
                    label="Pending Requests"
                    value={loading ? "—" : pendingCount}
                    icon={<span className="text-lg">&#9203;</span>}
                    className="border-warning/20"
                />
                <StatCard
                    label="Approved"
                    value={loading ? "—" : approvedCount}
                    icon={<span className="text-lg">&#9989;</span>}
                    className="border-success/20"
                />
                <StatCard
                    label="Rejected"
                    value={loading ? "—" : rejectedCount}
                    icon={<span className="text-lg">&#10060;</span>}
                    className="border-danger/20"
                />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-4">
                <Select
                    value={filter}
                    onChange={e => setFilter(e.target.value as any)}
                    options={STATUS_FILTER_OPTIONS}
                    className="w-40"
                />
                <span className="text-xs text-text-3">Showing {filtered.length} of {leaves.length} requests</span>
                <div className="ml-auto">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                        New Request
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-text-3">
                    <Spinner size="lg" />
                    <span>Loading leave requests...</span>
                </div>
            ) : (
                <Card>
                    <CardHeader className="flex-row items-center justify-between pb-0">
                        <CardTitle className="text-base">Leave Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-bg-2">
                                    {["Employee", "Type", "Duration", "Days", "Reason", "Status", "Actions"].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <EmptyState
                                                title="No leave requests found"
                                                description="There are no leave requests matching the current filter."
                                            />
                                        </td>
                                    </tr>
                                ) : filtered.map((req, i) => (
                                    <tr
                                        key={req.id}
                                        className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border last:border-0 animate-[fadeRow_0.3s_both]"
                                        style={{ animationDelay: `${i * 0.03}s` }}
                                    >
                                        <td className="px-4 py-3 text-base text-text">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    name={`${req.employee.firstName} ${req.employee.lastName}`}
                                                    size="default"
                                                />
                                                <span className="font-semibold">{req.employee.firstName} {req.employee.lastName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={TYPE_BADGE_VARIANT[req.type]}>
                                                {TYPE_LABELS[req.type]}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-2 font-mono">
                                            {format(new Date(req.startDate), "MMM d")} – {format(new Date(req.endDate), "MMM d")}
                                        </td>
                                        <td className="px-4 py-3 text-base text-text-2">
                                            {getDays(req.startDate, req.endDate)} day{getDays(req.startDate, req.endDate) !== 1 ? "s" : ""}
                                        </td>
                                        <td className="px-4 py-3 text-base text-text-3 max-w-[200px] truncate">{req.reason || "—"}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={STATUS_BADGE_VARIANT[req.status]} dot>
                                                {STATUS_LABELS[req.status]}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {req.status === "PENDING" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handleAction(req.id, "APPROVED")}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleAction(req.id, "REJECTED")}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-3">Reviewed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-end space-x-2 py-4 px-5 bg-bg-2 border-t border-border">
                            <div className="flex-1 text-xs text-text-3">
                                Showing page {page} of {pageCount || 1} ({totalRows} total requests)
                            </div>
                            <div className="space-x-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams?.toString() || "")
                                        params.set("page", (page - 1).toString())
                                        router.push(`${pathname}?${params.toString()}`)
                                    }}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page >= pageCount}
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams?.toString() || "")
                                        params.set("page", (page + 1).toString())
                                        router.push(`${pathname}?${params.toString()}`)
                                    }}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Leave Dialog */}
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <DialogHeader>
                    <DialogTitle>Create Leave Request</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <div className="space-y-4">
                        <Input
                            label="Employee ID *"
                            value={formData.employeeId}
                            onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                            placeholder="Employee CUID"
                        />
                        <Select
                            label="Leave Type *"
                            value={formData.type}
                            onChange={e => setFormData(p => ({ ...p, type: e.target.value as LeaveType }))}
                            options={LEAVE_TYPE_OPTIONS}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="date"
                                label="Start Date *"
                                value={formData.startDate}
                                onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                            />
                            <Input
                                type="date"
                                label="End Date *"
                                value={formData.endDate}
                                onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                            />
                        </div>
                        <Textarea
                            label="Reason"
                            value={formData.reason}
                            onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                            placeholder="Optional reason for leave"
                            className="resize-none h-20"
                        />
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} loading={saving}>
                        {saving ? "Creating..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    )
}
