"use client"

import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { hasPermission, Module, Action } from "@/lib/permissions"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Modal } from "@/components/ui/Modal"
import { ReimbursementAPI } from "@/features/reimbursements/api/client"

type Reimbursement = {
    id: string
    category: string
    amount: number
    description: string
    receiptUrl: string | null
    expenseDate: string
    status: string
    rejectionNote: string | null
    approvedBy: string | null
    approvedAt: string | null
    paidInMonth: string | null
    createdAt: string
    employee: {
        id: string
        firstName: string
        lastName: string
        employeeCode: string
        designation: string
        department: { name: string }
    }
}

const CATEGORY_LABELS: Record<string, string> = {
    TRAVEL: "Travel",
    MEALS: "Meals",
    OFFICE_SUPPLIES: "Office Supplies",
    MEDICAL: "Medical",
    TRAINING_EXPENSE: "Training",
    CONFERENCE: "Conference",
    RELOCATION: "Relocation",
    OTHER: "Other",
}

function getStatusBadge(status: string) {
    switch (status) {
        case "APPROVED": return <Badge variant="success" dot>{status}</Badge>
        case "REJECTED": return <Badge variant="danger" dot>{status}</Badge>
        case "PAID": return <Badge variant="info" dot>{status}</Badge>
        default: return <Badge variant="warning" dot>{status}</Badge>
    }
}

function getCategoryBadge(category: string) {
    const label = CATEGORY_LABELS[category] || category
    const variant = category === "MEDICAL" ? "danger"
        : category === "TRAVEL" ? "info"
            : category === "TRAINING_EXPENSE" || category === "CONFERENCE" ? "purple"
                : "neutral"
    return <Badge variant={variant} size="sm">{label}</Badge>
}

export function AdminReimbursementView() {
    const { user } = useAuth()
    const canApprove = hasPermission(user?.role ?? '', Module.REIMBURSEMENT, Action.UPDATE)
    const [records, setRecords] = React.useState<Reimbursement[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [filterStatus, setFilterStatus] = React.useState("")
    const [rejectId, setRejectId] = React.useState<string | null>(null)
    const [rejectionNote, setRejectionNote] = React.useState("")
    const [processing, setProcessing] = React.useState<string | null>(null)

    const fetchRecords = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams()
            if (filterStatus) params.set("status", filterStatus)
            const filterStr = params.toString()
            const data = await ReimbursementAPI.list(filterStr || undefined)
            setRecords((data as any)?.results || extractArray<Reimbursement>(data))
        } catch {
            toast.error("Failed to load reimbursement requests")
        } finally {
            setIsLoading(false)
        }
    }, [filterStatus])

    React.useEffect(() => { fetchRecords() }, [fetchRecords])

    const handleAction = async (id: string, status: "APPROVED" | "REJECTED", note?: string) => {
        setProcessing(id)
        try {
            await ReimbursementAPI.update(id, { status, rejectionNote: note })
            toast.success(`Request ${status.toLowerCase()}`)
            setRejectId(null)
            setRejectionNote("")
            fetchRecords()
        } catch (error: any) {
            toast.error(error.message || "Action failed")
        } finally {
            setProcessing(null)
        }
    }

    const totals = React.useMemo(() => {
        const pending = records.filter(r => r.status === "PENDING")
        const approved = records.filter(r => r.status === "APPROVED")
        const totalPending = pending.reduce((s, r) => s + r.amount, 0)
        const totalApproved = approved.reduce((s, r) => s + r.amount, 0)
        return { pendingCount: pending.length, approvedCount: approved.length, totalPending, totalApproved, total: records.length }
    }, [records])

    const filteredRecords = records

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Reimbursement Requests"
                description="Review and manage expense reimbursement requests from employees"
                actions={
                    <div className="flex items-center gap-2">
                        <Select
                            value={filterStatus}
                            onChange={(e: any) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="PAID">Paid</option>
                        </Select>
                    </div>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Pending Requests"
                    value={totals.pendingCount}
                    icon={<span className="text-lg">⏳</span>}
                    change={{ value: `₹${totals.totalPending.toLocaleString()}`, positive: false }}
                />
                <StatCard
                    label="Approved"
                    value={totals.approvedCount}
                    icon={<span className="text-lg">✅</span>}
                    change={{ value: `₹${totals.totalApproved.toLocaleString()}`, positive: true }}
                />
                <StatCard
                    label="Total Requests"
                    value={totals.total}
                    icon={<span className="text-lg">📋</span>}
                />
                <StatCard
                    label="Total Value"
                    value={`₹${(totals.totalPending + totals.totalApproved).toLocaleString()}`}
                    icon={<span className="text-lg">💰</span>}
                />
            </div>

            <Card>
                <CardHeader className="flex-row items-center justify-between border-b border-border p-4">
                    <CardTitle className="text-sm flex items-center gap-2">📋 All Reimbursement Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-bg-2">
                                    {["Employee", "Category", "Amount", "Expense Date", "Description", "Status", ...(canApprove ? ["Actions"] : [])].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-text-3 animate-pulse">Loading requests...</td>
                                    </tr>
                                ) : filteredRecords.length > 0 ? filteredRecords.map((rec) => (
                                    <tr key={rec.id} className="group hover:bg-accent/[0.03] transition-colors border-b border-border/40 last:border-0">
                                        <td className="px-4 py-3 text-sm text-text">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={`${rec.employee.firstName} ${rec.employee.lastName}`} size="sm" />
                                                <div>
                                                    <div className="font-semibold tracking-tight">{rec.employee.firstName} {rec.employee.lastName}</div>
                                                    <div className="text-[11px] text-text-3">{rec.employee.designation} · {rec.employee.department.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{getCategoryBadge(rec.category)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-accent font-mono">₹{rec.amount.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-sm text-text-2 font-mono">{format(new Date(rec.expenseDate), "dd MMM yyyy")}</td>
                                        <td className="px-4 py-3 text-sm text-text-2 max-w-[200px] truncate" title={rec.description}>{rec.description}</td>
                                        <td className="px-4 py-3">{getStatusBadge(rec.status)}</td>
                                        {canApprove && (
                                            <td className="px-4 py-3">
                                                {rec.status === "PENDING" ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            onClick={() => handleAction(rec.id, "APPROVED")}
                                                            loading={processing === rec.id}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => setRejectId(rec.id)}
                                                            disabled={processing === rec.id}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-text-4">—</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7}>
                                            <EmptyState
                                                icon={<span className="text-2xl">📋</span>}
                                                title="No reimbursement requests"
                                                description={filterStatus ? "No requests match the current filter." : "No reimbursement requests have been submitted yet."}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Rejection Modal */}
            <Modal
                isOpen={!!rejectId}
                onClose={() => { setRejectId(null); setRejectionNote("") }}
                title="Reject Reimbursement"
            >
                <div className="space-y-4">
                    <p className="text-sm text-text-2">Please provide a reason for rejecting this request.</p>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-text">Reason for Rejection</label>
                        <textarea
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                            rows={3}
                            placeholder="e.g. Missing receipt, amount exceeds policy limit..."
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-none text-text placeholder:text-text-4"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="ghost" className="flex-1" onClick={() => { setRejectId(null); setRejectionNote("") }}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={() => rejectId && handleAction(rejectId, "REJECTED", rejectionNote)}
                            loading={processing === rejectId}
                        >
                            Confirm Rejection
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
