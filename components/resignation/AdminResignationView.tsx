import * as React from "react"
import { cn } from "@/lib/utils"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"

type Resignation = {
    id: string
    reason: string
    lastDay: string
    status: "UNDER_REVIEW" | "NOTICE_PERIOD" | "PROCESSED"
    employeeId: string
    employee: {
        firstName: string
        lastName: string
        designation: string
        department: { name: string }
    }
}

export function AdminResignationView() {
    const [resignations, setResignations] = React.useState<Resignation[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [filterStatus, setFilterStatus] = React.useState("ALL")

    const fetchResignations = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/resignations')
            if (res.ok) {
                setResignations(await res.json())
            }
        } catch {
            toast.error("Failed to load resignations")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchResignations()
    }, [fetchResignations])

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/resignations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            })
            if (res.ok) {
                toast.success("Status updated")
                fetchResignations()
            } else {
                toast.error("Update failed")
            }
        } catch {
            toast.error("An error occurred")
        }
    }

    const filtered = resignations.filter(r => filterStatus === "ALL" || r.status === filterStatus)

    const stats = React.useMemo(() => {
        return {
            highRisk: resignations.filter(r => r.status === 'UNDER_REVIEW').length,
            notice: resignations.filter(r => r.status === 'NOTICE_PERIOD').length,
            processed: resignations.filter(r => r.status === 'PROCESSED').length,
            attrition: ((resignations.length / 50) * 100).toFixed(1) // Mock total of 50 for pct
        }
    }, [resignations])

    const reasonCounts = React.useMemo(() => {
        const counts: Record<string, number> = {}
        resignations.forEach(r => {
            counts[r.reason] = (counts[r.reason] || 0) + 1
        })
        return Object.entries(counts).sort((a, b) => b[1] - a[1])
    }, [resignations])

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-5 bg-[var(--surface)] border-[var(--border)] relative overflow-hidden">
                    <div className="text-[11px] font-bold text-[var(--red)] uppercase tracking-[0.6px] mb-[6px]">Under Review</div>
                    <div className="text-[36px] font-extrabold text-[var(--red)]">{stats.highRisk}</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">Pending approval</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-20">🚨</div>
                </div>
                <div className="glass p-5 bg-[var(--surface)] border-[var(--border)] relative overflow-hidden">
                    <div className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-[0.6px] mb-[6px]">Notice Period</div>
                    <div className="text-[36px] font-extrabold text-[var(--amber)]">{stats.notice}</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">Serving notice</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-20">⏳</div>
                </div>
                <div className="glass p-5 bg-[var(--surface)] border-[var(--border)] relative overflow-hidden">
                    <div className="text-[11px] font-bold text-[#1a9140] uppercase tracking-[0.6px] mb-[6px]">Processed</div>
                    <div className="text-[36px] font-extrabold text-[#1a9140]">{stats.processed}</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">Successfully exited</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-20">✅</div>
                </div>
                <div className="glass p-5 bg-[var(--surface)] border-[var(--border)]">
                    <div className="text-[11px] font-bold text-[var(--text3)] uppercase mb-2">Attrition Rate</div>
                    <div className="text-[36px] font-extrabold text-[var(--accent)]">{stats.attrition}%</div>
                    <div className="h-2 rounded-full bg-[var(--bg2)] mt-2 overflow-hidden">
                        <div className="h-full bg-[var(--accent)]" style={{ width: `${stats.attrition}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                    <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)]">
                        <div className="text-[14px] font-bold text-[var(--text)]">📋 Resignation Records</div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="p-1 text-[12px] bg-[var(--surface)] border border-[var(--border)] rounded-md outline-none"
                        >
                            <option value="ALL">All Status</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="NOTICE_PERIOD">Notice Period</option>
                            <option value="PROCESSED">Processed</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                                    {['Employee', 'Reason', 'Last Day', 'Status', 'Actions'].map((h) => (
                                        <th key={h} className="p-[11px_18px] text-[11px] font-bold text-[var(--text3)] text-left uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!isLoading ? filtered.map((res) => (
                                    <tr key={res.id} className="border-b border-[#0000000a] last:border-0 hover:bg-[rgba(0,122,255,0.02)] transition-colors">
                                        <td className="p-[13px_18px]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-[11px]">
                                                    {res.employee.firstName.charAt(0)}{res.employee.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[13px]">{res.employee.firstName} {res.employee.lastName}</div>
                                                    <div className="text-[11px] text-[var(--text3)]">{res.employee.designation}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-[13px_18px]">
                                            <span className="px-2 py-1 bg-[var(--bg2)] text-[11px] rounded font-medium text-[var(--text2)]">{res.reason}</span>
                                        </td>
                                        <td className="p-[13px_18px] text-[12px] font-mono">{format(new Date(res.lastDay), "MMM d, yyyy")}</td>
                                        <td className="p-[13px_18px]">
                                            <span className={cn("text-[11px] font-bold px-2 py-1 rounded-full border",
                                                res.status === 'UNDER_REVIEW' ? "bg-[var(--blue-dim)] text-[var(--accent)] border-[var(--accent)]/20" :
                                                    res.status === 'NOTICE_PERIOD' ? "bg-[var(--amber-dim)] text-[var(--amber)] border-[var(--amber)]/20" :
                                                        "bg-[var(--green-dim)] text-[#1a9140] border-[#1a9140]/20"
                                            )}>
                                                {res.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-[13px_18px]">
                                            <div className="flex gap-1">
                                                {res.status === 'UNDER_REVIEW' && (
                                                    <button
                                                        onClick={() => updateStatus(res.id, 'NOTICE_PERIOD')}
                                                        className="p-1 hover:bg-[var(--amber-dim)] rounded text-[var(--amber)]" title="Approve to Notice Period">⏳</button>
                                                )}
                                                {res.status === 'NOTICE_PERIOD' && (
                                                    <button
                                                        onClick={() => updateStatus(res.id, 'PROCESSED')}
                                                        className="p-1 hover:bg-[var(--green-dim)] rounded text-[var(--green)]" title="Mark as Processed">✓</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="p-10 text-center text-[var(--text3)]">Loading...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass p-6 space-y-6">
                    <div>
                        <div className="text-[14px] font-bold mb-4">📊 Exit Reason Trends</div>
                        <div className="space-y-4">
                            {reasonCounts.map(([reason, count]) => (
                                <div key={reason} className="space-y-1">
                                    <div className="flex justify-between text-[12px]">
                                        <span>{reason}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[var(--bg2)] overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[var(--blue)] to-[var(--accent)]"
                                            style={{ width: `${(count / resignations.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {resignations.length === 0 && <div className="text-[12px] text-[var(--text3)]">No data yet</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
