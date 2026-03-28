import * as React from "react"
import { extractArray, cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { CsvImportModal } from "@/components/ui/CsvImportModal"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { StatCard } from "@/components/ui/StatCard"
import { Card, CardContent } from "@/components/ui/Card"
import { Select } from "@/components/ui/Select"
import { Avatar } from "@/components/ui/Avatar"
import { ResignationAPI } from "@/features/resignations/api/client"

type Resignation = {
    id: string
    reason: string
    lastWorkingDate: string
    status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN"
    statusDisplay: string
    employeeName: string
    approvedByName: string | null
    submittedAt: string
}

function normalizeResignation(raw: any): Resignation {
    return {
        id: raw.id,
        reason: raw.reason || "",
        lastWorkingDate: raw.lastWorkingDate || "",
        status: raw.status || "PENDING",
        statusDisplay: raw.statusDisplay || raw.status || "",
        employeeName: raw.employeeName || "—",
        approvedByName: raw.approvedByName || null,
        submittedAt: raw.submittedAt || raw.createdAt || "",
    }
}

export function AdminResignationView() {
    const [resignations, setResignations] = React.useState<Resignation[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [filterStatus, setFilterStatus] = React.useState("ALL")
    const [isImportOpen, setIsImportOpen] = React.useState(false)

    const fetchResignations = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await ResignationAPI.list()
            const raw = (data as any)?.results || extractArray(data)
            setResignations(raw.map(normalizeResignation))
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
            await ResignationAPI.update(id, { status: newStatus })
            toast.success("Status updated")
            fetchResignations()
        } catch {
            toast.error("An error occurred")
        }
    }

    const filtered = resignations.filter(r => filterStatus === "ALL" || r.status === filterStatus)

    const stats = React.useMemo(() => {
        return {
            pending: resignations.filter(r => r.status === 'PENDING').length,
            approved: resignations.filter(r => r.status === 'APPROVED').length,
            rejected: resignations.filter(r => r.status === 'REJECTED').length,
            total: resignations.length,
        }
    }, [resignations])

    const reasonCounts = React.useMemo(() => {
        const counts: Record<string, number> = {}
        resignations.forEach(r => {
            counts[r.reason] = (counts[r.reason] || 0) + 1
        })
        return Object.entries(counts).sort((a, b) => b[1] - a[1])
    }, [resignations])

    const getStatusBadgeVariant = (status: string): "info" | "warning" | "success" | "danger" => {
        switch (status) {
            case 'PENDING': return "warning"
            case 'APPROVED': return "info"
            case 'REJECTED': return "danger"
            case 'WITHDRAWN': return "neutral" as any
            default: return "success"
        }
    }

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Resignation Management"
                description="Review and manage resignation requests"
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => setIsImportOpen(true)}
                    >
                        📥 Import CSV
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-5 bg-surface border-border relative overflow-hidden">
                    <div className="text-xs font-bold text-warning uppercase tracking-[0.6px] mb-1.5">Pending</div>
                    <div className="text-[36px] font-extrabold text-warning">{stats.pending}</div>
                    <div className="text-sm text-text-3 mt-1">Awaiting review</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[30px] opacity-20">⏳</div>
                </div>
                <div className="glass p-5 bg-surface border-border relative overflow-hidden">
                    <div className="text-xs font-bold text-info uppercase tracking-[0.6px] mb-1.5">Approved</div>
                    <div className="text-[36px] font-extrabold text-info">{stats.approved}</div>
                    <div className="text-sm text-text-3 mt-1">Serving notice</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[30px] opacity-20">✅</div>
                </div>
                <div className="glass p-5 bg-surface border-border relative overflow-hidden">
                    <div className="text-xs font-bold text-danger uppercase tracking-[0.6px] mb-1.5">Rejected</div>
                    <div className="text-[36px] font-extrabold text-danger">{stats.rejected}</div>
                    <div className="text-sm text-text-3 mt-1">Declined by HR</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[30px] opacity-20">❌</div>
                </div>
                <div className="glass p-5 bg-surface border-border">
                    <div className="text-xs font-bold text-text-3 uppercase mb-2">Total Requests</div>
                    <div className="text-[36px] font-extrabold text-accent">{stats.total}</div>
                    <div className="text-sm text-text-3 mt-1">All time</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                <Card className="overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-border bg-surface-2">
                        <div className="text-md font-bold text-text">📋 Resignation Records</div>
                        <Select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-auto py-1 text-sm"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="WITHDRAWN">Withdrawn</option>
                        </Select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-surface-2">
                                    {['Employee', 'Reason', 'Last Day', 'Status', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!isLoading ? filtered.map((res) => (
                                    <tr key={res.id} className="border-b border-[#0000000a] last:border-0 hover:bg-[rgba(0,122,255,0.02)] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={res.employeeName} size="sm" />
                                                <span className="font-semibold text-base">{res.employeeName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="neutral" size="sm">{res.reason.split(" | ")[0]}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono">{res.lastWorkingDate ? format(new Date(res.lastWorkingDate), "MMM d, yyyy") : "—"}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={getStatusBadgeVariant(res.status)}>
                                                {res.statusDisplay || res.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {res.status === 'PENDING' && (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => updateStatus(res.id, 'APPROVED')} title="Approve">✅</Button>
                                                        <Button variant="ghost" size="icon" onClick={() => updateStatus(res.id, 'REJECTED')} title="Reject">❌</Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center">
                                            <Spinner size="lg" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card variant="glass" className="p-6 space-y-6">
                    <div>
                        <div className="text-md font-bold mb-4">📊 Exit Reason Trends</div>
                        <div className="space-y-4">
                            {reasonCounts.map(([reason, count]) => (
                                <div key={reason} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>{reason}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-bg-2 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-info to-accent"
                                            style={{ width: `${(count / resignations.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {resignations.length === 0 && <div className="text-sm text-text-3">No data yet</div>}
                        </div>
                    </div>
                </Card>
            </div>
            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                title="Resignation Records"
                templateHeaders={["employeeCode", "reason", "lastDay", "status"]}
                apiEndpoint="/api/resignations/import"
                onSuccess={fetchResignations}
            />
        </div>
    )
}
