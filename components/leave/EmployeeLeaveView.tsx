"use client"

import * as React from "react"
import { CalendarIcon, PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { format, differenceInCalendarDays } from "date-fns"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"
import { LeaveAPI } from "@/features/leave/api/client"

type LeaveType = "CASUAL" | "SICK" | "EARNED" | "MATERNITY" | "PATERNITY" | "UNPAID"
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

interface WorkflowStatusInfo {
    instanceId: string
    status: string
    currentStep: number
    totalSteps: number
}

interface LeaveRequest {
    id: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string | null
    status: LeaveStatus
    workflowStatus: WorkflowStatusInfo | null
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

const STATUS_BADGE_VARIANT: Record<LeaveStatus, "warning" | "success" | "danger"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "danger",
}

const STATUS_LABELS: Record<LeaveStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
}

const getDays = (start: string, end: string) =>
    differenceInCalendarDays(new Date(end), new Date(start)) + 1

const LEAVE_TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as LeaveType[]).map(t => ({
    value: t,
    label: TYPE_LABELS[t],
}))

export function EmployeeLeaveView() {
    const [leaves, setLeaves] = React.useState<LeaveRequest[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [formData, setFormData] = React.useState({
        type: "CASUAL" as LeaveType,
        startDate: "",
        endDate: "",
        reason: "",
    })
    const [saving, setSaving] = React.useState(false)

    const fetchLeaves = React.useCallback(async () => {
        try {
            const response = await LeaveAPI.list()
            setLeaves(response.results as unknown as LeaveRequest[])
        } catch {
            toast.error("Failed to load leave history")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchLeaves()
    }, [fetchLeaves])

    const handleApply = async () => {
        if (!formData.startDate || !formData.endDate) {
            toast.error("Start date and end date are required")
            return
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            toast.error("End date must be after start date")
            return
        }
        setSaving(true)
        try {
            await LeaveAPI.create({
                type: formData.type,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason || null,
            })
            toast.success("Leave request submitted")
            setIsModalOpen(false)
            setFormData({ type: "CASUAL", startDate: "", endDate: "", reason: "" })
            fetchLeaves()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to submit leave request")
        } finally {
            setSaving(false)
        }
    }

    const computeBalance = (type: LeaveType, quota: number) => {
        const used = leaves
            .filter(l => l.type === type && l.status === "APPROVED")
            .reduce((sum, l) => sum + getDays(l.startDate, l.endDate), 0)
        return { used, available: Math.max(0, quota - used), quota }
    }

    const casualBal = computeBalance("CASUAL", 15)
    const sickBal = computeBalance("SICK", 10)
    const earnedBal = computeBalance("EARNED", 15)

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="My Leave"
                description="Manage your leave balance and requests"
                actions={
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                        Apply Leave
                    </Button>
                }
            />

            {/* Leave Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card variant="glass" className="p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <Badge variant="info" size="sm">
                            {loading ? "—" : `${casualBal.available} Available`}
                        </Badge>
                    </div>
                    <div className="text-2xl font-extrabold text-text mb-1">Casual Leave</div>
                    <div className="text-xs text-text-3">Used: {loading ? "—" : `${casualBal.used} / ${casualBal.quota}`} days</div>
                </Card>

                <Card variant="glass" className="p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
                            <span className="text-lg">+</span>
                        </div>
                        <Badge variant="danger" size="sm">
                            {loading ? "—" : `${sickBal.available} Available`}
                        </Badge>
                    </div>
                    <div className="text-2xl font-extrabold text-text mb-1">Sick Leave</div>
                    <div className="text-xs text-text-3">Used: {loading ? "—" : `${sickBal.used} / ${sickBal.quota}`} days</div>
                </Card>

                <Card variant="glass" className="p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                            <span className="text-lg">*</span>
                        </div>
                        <Badge variant="success" size="sm">
                            {loading ? "—" : `${earnedBal.available} Available`}
                        </Badge>
                    </div>
                    <div className="text-2xl font-extrabold text-text mb-1">Earned Leave</div>
                    <div className="text-xs text-text-3">Used: {loading ? "—" : `${earnedBal.used} / ${earnedBal.quota}`} days</div>
                </Card>
            </div>

            {/* Leave History Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-text-3">
                    <Spinner size="lg" />
                    <span>Loading leave history...</span>
                </div>
            ) : (
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-base">My Request History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-bg-2">
                                    {["Leave Type", "Dates", "Duration", "Reason", "Status", "Reviewed By"].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <EmptyState
                                                title="No leave requests yet"
                                                description="You haven't submitted any leave requests. Click 'Apply Leave' to get started."
                                                action={
                                                    <Button
                                                        onClick={() => setIsModalOpen(true)}
                                                        leftIcon={<PlusIcon className="w-4 h-4" />}
                                                    >
                                                        Apply Leave
                                                    </Button>
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : leaves.map((req) => (
                                    <tr key={req.id} className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border last:border-0">
                                        <td className="px-4 py-3">
                                            <Badge variant={TYPE_BADGE_VARIANT[req.type]}>
                                                {TYPE_LABELS[req.type]}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-2 font-mono">
                                            {format(new Date(req.startDate), "MMM d")} – {format(new Date(req.endDate), "MMM d, yyyy")}
                                        </td>
                                        <td className="px-4 py-3 text-base text-text-2">
                                            {getDays(req.startDate, req.endDate)} day{getDays(req.startDate, req.endDate) !== 1 ? "s" : ""}
                                        </td>
                                        <td className="px-4 py-3 text-base text-text-3 max-w-[200px] truncate">{req.reason || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={STATUS_BADGE_VARIANT[req.status]} dot>
                                                    {STATUS_LABELS[req.status]}
                                                </Badge>
                                                {req.workflowStatus && req.workflowStatus.status !== 'APPROVED' && req.workflowStatus.status !== 'REJECTED' && (
                                                    <span className="text-xs text-info">
                                                        Step {req.workflowStatus.currentStep} of {req.workflowStatus.totalSteps} — Awaiting Approval
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-2">
                                            {(req as any).actionedByName || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Apply Leave Dialog */}
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <DialogHeader>
                    <DialogTitle>Apply for Leave</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <div className="space-y-4">
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
                            placeholder="Optional reason for your leave"
                            className="resize-none h-20"
                        />
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply} loading={saving}>
                        {saving ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    )
}
