"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Modal } from "@/components/ui/Modal"
import { CalendarIcon, PlusIcon } from "@radix-ui/react-icons"
import toast from "react-hot-toast"
import { format, differenceInCalendarDays } from "date-fns"

type LeaveType = "CASUAL" | "SICK" | "EARNED" | "MATERNITY" | "PATERNITY" | "UNPAID"
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

interface LeaveRequest {
    id: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string | null
    status: LeaveStatus
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

const getDays = (start: string, end: string) =>
    differenceInCalendarDays(new Date(end), new Date(start)) + 1

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
            const res = await fetch("/api/leaves")
            if (!res.ok) throw new Error("Failed to fetch")
            setLeaves(await res.json())
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
            const res = await fetch("/api/leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: formData.type,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    reason: formData.reason || null,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to apply")
            }
            toast.success("Leave request submitted")
            setIsModalOpen(false)
            setFormData({ type: "CASUAL", startDate: "", endDate: "", reason: "" })
            fetchLeaves()
        } catch (error: any) {
            toast.error(error.message || "Failed to submit leave request")
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

    const inputClass = "w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] transition-all"
    const labelClass = "block text-[12px] font-semibold text-[var(--text2)] mb-1.5"

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Leave</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage your leave balance and requests</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 p-[10px_16px] bg-[var(--accent)] text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                >
                    <PlusIcon className="w-4 h-4" /> Apply Leave
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">{loading ? "—" : `${casualBal.available} Available`}</span>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)] mb-1">Casual Leave</div>
                    <div className="text-[12px] text-[var(--text3)]">Used: {loading ? "—" : `${casualBal.used} / ${casualBal.quota}`} days</div>
                </div>

                <div className="glass p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <span className="text-lg">+</span>
                        </div>
                        <span className="text-[11px] font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-full">{loading ? "—" : `${sickBal.available} Available`}</span>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)] mb-1">Sick Leave</div>
                    <div className="text-[12px] text-[var(--text3)]">Used: {loading ? "—" : `${sickBal.used} / ${sickBal.quota}`} days</div>
                </div>

                <div className="glass p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <span className="text-lg">*</span>
                        </div>
                        <span className="text-[11px] font-bold bg-green-500/10 text-green-500 px-2 py-1 rounded-full">{loading ? "—" : `${earnedBal.available} Available`}</span>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)] mb-1">Earned Leave</div>
                    <div className="text-[12px] text-[var(--text3)]">Used: {loading ? "—" : `${earnedBal.used} / ${earnedBal.quota}`} days</div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading leave history...</div>
            ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r,12px)] overflow-hidden shadow-sm">
                    <div className="p-[16px_20px] border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                        <h3 className="text-[14px] font-bold text-[var(--text)]">My Request History</h3>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2,var(--surface))] backdrop-blur-md">
                                {["Leave Type", "Dates", "Duration", "Reason", "Status"].map(h => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-[var(--text3)] text-[13px]">No leave requests yet.</td></tr>
                            ) : leaves.map((req, i) => (
                                <tr key={req.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0">
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border border-transparent", TYPE_COLORS[req.type])}>
                                            {TYPE_LABELS[req.type]}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px] text-[12.5px] text-[var(--text2)] font-mono">
                                        {format(new Date(req.startDate), "MMM d")} – {format(new Date(req.endDate), "MMM d, yyyy")}
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
                                            {req.status === "PENDING" ? "⏳" : req.status === "APPROVED" ? "✓" : "✕"} {req.status === "PENDING" ? "Pending" : req.status === "APPROVED" ? "Approved" : "Rejected"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply for Leave">
                <div className="space-y-4">
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
                            placeholder="Optional reason for your leave"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors">Cancel</button>
                        <button onClick={handleApply} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                            {saving ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
