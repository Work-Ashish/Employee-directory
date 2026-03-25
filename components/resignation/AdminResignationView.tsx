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
    const [isImportOpen, setIsImportOpen] = React.useState(false)

    const fetchResignations = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await ResignationAPI.list()
            setResignations((data as any)?.results || extractArray<Resignation>(data))
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

    const getStatusBadgeVariant = (status: string): "info" | "warning" | "success" => {
        switch (status) {
            case 'UNDER_REVIEW': return "info"
            case 'NOTICE_PERIOD': return "warning"
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
                    <div className="text-xs font-bold text-danger uppercase tracking-[0.6px] mb-1.5">Under Review</div>
                    <div className="text-[36px] font-extrabold text-danger">{stats.highRisk}</div>
                    <div className="text-sm text-text-3 mt-1">Pending approval</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[30px] opacity-20">🚨</div>
                </div>
                <div className="glass p-5 bg-surface border-border relative overflow-hidden">
                    <div className="text-xs font-bold text-warning uppercase tracking-[0.6px] mb-1.5">Notice Period</div>
                    <div className="text-[36px] font-extrabold text-warning">{stats.notice}</div>
                    <div className="text-sm text-text-3 mt-1">Serving notice</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[30px] opacity-20">⏳</div>
                </div>
                <div className="glass p-5 bg-surface border-border relative overflow-hidden">
                    <div className="text-xs font-bold text-success uppercase tracking-[0.6px] mb-1.5">Processed</div>
                    <div className="text-[36px] font-extrabold text-success">{stats.processed}</div>
                    <div className="text-sm text-text-3 mt-1">Successfully exited</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[30px] opacity-20">✅</div>
                </div>
                <div className="glass p-5 bg-surface border-border">
                    <div className="text-xs font-bold text-text-3 uppercase mb-2">Attrition Rate</div>
                    <div className="text-[36px] font-extrabold text-accent">{stats.attrition}%</div>
                    <div className="h-2 rounded-full bg-bg-2 mt-2 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${stats.attrition}%` }} />
                    </div>
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
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="NOTICE_PERIOD">Notice Period</option>
                            <option value="PROCESSED">Processed</option>
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
                                                <Avatar
                                                    name={`${res.employee.firstName} ${res.employee.lastName}`}
                                                    size="sm"
                                                />
                                                <div>
                                                    <div className="font-semibold text-base">{res.employee.firstName} {res.employee.lastName}</div>
                                                    <div className="text-xs text-text-3">{res.employee.designation}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="neutral" size="sm">{res.reason}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono">{format(new Date(res.lastDay), "MMM d, yyyy")}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={getStatusBadgeVariant(res.status)}>
                                                {res.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {res.status === 'UNDER_REVIEW' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => updateStatus(res.id, 'NOTICE_PERIOD')}
                                                        title="Approve to Notice Period"
                                                    >
                                                        ⏳
                                                    </Button>
                                                )}
                                                {res.status === 'NOTICE_PERIOD' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => updateStatus(res.id, 'PROCESSED')}
                                                        title="Mark as Processed"
                                                    >
                                                        ✓
                                                    </Button>
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
