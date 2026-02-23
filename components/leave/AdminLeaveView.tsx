"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon } from "@radix-ui/react-icons"
import toast from "react-hot-toast"
import { format, differenceInCalendarDays } from "date-fns"

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

const TYPE_COLORS: Record<LeaveType, string> = {
    CASUAL: "bg-[var(--blue-dim)] text-[#0a7ea4]",
    SICK: "bg-[var(--red-dim)] text-[var(--red)]",
    EARNED: "bg-[var(--green-dim)] text-[#1a9140]",
    MATERNITY: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    PATERNITY: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    UNPAID: "bg-[var(--bg2)] text-[var(--text3)]",
}

const STATUS_LABELS: Record<LeaveStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
}

const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()

const getDays = (start: string, end: string) =>
    differenceInCalendarDays(new Date(end), new Date(start)) + 1

export function AdminLeaveView() {
    const [leaves, setLeaves] = React.useState<LeaveRequest[]>([])
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
            const res = await fetch("/api/leaves")
            if (!res.ok) throw new Error("Failed to fetch")
            setLeaves(await res.json())
        } catch {
            toast.error("Failed to load leave requests")
        } finally {
            setLoading(false)
        }
    }, [])

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

    const inputClass = "w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] transition-all"
    const labelClass = "block text-[12px] font-semibold text-[var(--text2)] mb-1.5"

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Leave Management</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Review and approve employee leave requests</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Pending Requests</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber,#f59e0b)]">{loading ? "—" : pendingCount}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,149,0,0.12)] shrink-0">&#9203;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--amber,#f59e0b)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Approved</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140]">{loading ? "—" : approvedCount}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">&#9989;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--green,#22c55e)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Rejected</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--red,#ef4444)]">{loading ? "—" : rejectedCount}</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,59,48,0.1)] shrink-0">&#10060;</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--red,#ef4444)] to-transparent" />
                </div>
            </div>

            <div className="flex items-center gap-[12px] mb-[18px]">
                <select
                    className="p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] cursor-pointer outline-none transition-all duration-200 shadow-sm hover:border-[var(--border2)]"
                    value={filter}
                    onChange={e => setFilter(e.target.value as any)}
                >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
                <span className="text-[12.5px] text-[var(--text3)]">Showing {filtered.length} of {leaves.length} requests</span>
                <div className="ml-auto">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                    >
                        <PlusIcon className="w-4 h-4" /> New Request
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading leave requests...</div>
            ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r,12px)] overflow-hidden shadow-sm">
                    <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                        <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">Leave Requests</div>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                                {["Employee", "Type", "Duration", "Days", "Reason", "Status", "Actions"].map(h => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-[var(--text3)] text-[13px]">No leave requests found.</td></tr>
                            ) : filtered.map((req, i) => (
                                <tr key={req.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.03}s` }}>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                        <div className="flex items-center gap-[11px]">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br from-[#007aff] to-[#5856d6]">
                                                {getInitials(req.employee.firstName, req.employee.lastName)}
                                            </div>
                                            <span className="font-semibold">{req.employee.firstName} {req.employee.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border border-transparent", TYPE_COLORS[req.type])}>
                                            {TYPE_LABELS[req.type]}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px] text-[12.5px] text-[var(--text2)] font-mono">
                                        {format(new Date(req.startDate), "MMM d")} – {format(new Date(req.endDate), "MMM d")}
                                    </td>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text2)]">
                                        {getDays(req.startDate, req.endDate)} day{getDays(req.startDate, req.endDate) !== 1 ? "s" : ""}
                                    </td>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text3)] max-w-[200px] truncate">{req.reason || "—"}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                                            req.status === "APPROVED"
                                                ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                                                : req.status === "PENDING"
                                                    ? "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]"
                                                    : "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.25)]"
                                        )}>
                                            {req.status === "PENDING" ? "⏳" : req.status === "APPROVED" ? "✓" : "✕"} {STATUS_LABELS[req.status]}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        {req.status === "PENDING" ? (
                                            <div className="flex items-center gap-[6px]">
                                                <button
                                                    onClick={() => handleAction(req.id, "APPROVED")}
                                                    className="flex items-center gap-1 px-[14px] py-[6px] text-[12.5px] font-semibold rounded-[8px] bg-[var(--green-dim)] text-[#1a9140] border border-[rgba(52,199,89,0.3)] hover:bg-[rgba(52,199,89,0.2)] transition-colors"
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, "REJECTED")}
                                                    className="flex items-center gap-1 px-[14px] py-[6px] text-[12.5px] font-semibold rounded-[8px] bg-[var(--red-dim)] text-[var(--red)] border border-[rgba(255,59,48,0.25)] hover:bg-[rgba(255,59,48,0.15)] transition-colors"
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[12px] text-[var(--text3)]">Reviewed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Leave Request">
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Employee ID *</label>
                        <input
                            className={inputClass}
                            value={formData.employeeId}
                            onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                            placeholder="Employee CUID"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Leave Type *</label>
                        <select
                            className={inputClass}
                            value={formData.type}
                            onChange={e => setFormData(p => ({ ...p, type: e.target.value as LeaveType }))}
                        >
                            {(Object.keys(TYPE_LABELS) as LeaveType[]).map(t => (
                                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Start Date *</label>
                            <input type="date" className={inputClass} value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
                        </div>
                        <div>
                            <label className={labelClass}>End Date *</label>
                            <input type="date" className={inputClass} value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Reason</label>
                        <textarea
                            className={cn(inputClass, "resize-none h-20")}
                            value={formData.reason}
                            onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                            placeholder="Optional reason for leave"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors">Cancel</button>
                        <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                            {saving ? "Creating..." : "Submit Request"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
