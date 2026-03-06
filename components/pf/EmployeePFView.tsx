import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { EmptyState } from "@/components/ui/EmptyState"

type PFRecord = {
    id: string
    month: string
    accountNumber: string
    basicSalary: number
    employeeContribution: number
    employerContribution: number
    totalContribution: number
    status: string
}

export function EmployeePFView() {
    const [records, setRecords] = React.useState<PFRecord[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchRecords = async () => {
            try {
                const res = await fetch('/api/pf')
                if (res.ok) {
                    setRecords(extractArray<PFRecord>(await res.json()))
                }
            } catch (error) {
                toast.error("Failed to load PF records")
            } finally {
                setIsLoading(false)
            }
        }
        fetchRecords()
    }, [])

    const latest = records[0]
    const totalAccumulated = records.reduce((sum, r) => sum + r.totalContribution, 0)

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="My Provident Fund"
                description="Your savings and contributions overview"
            />

            <div className="grid grid-cols-[1.5fr_1fr] gap-6 mb-6">
                <div className="glass p-8 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-base font-medium text-white/80 uppercase tracking-wider mb-2">Total Accumulated Corpus</div>
                        <div className="text-[48px] font-extrabold leading-none mb-4">${totalAccumulated.toLocaleString()}</div>
                        <div className="flex gap-4 text-base text-white/90">
                            <Badge className="bg-white/20 text-white border-transparent text-xs">Last Credit: {latest?.month || 'N/A'}</Badge>
                            <Badge className="bg-white/20 text-white border-transparent text-xs">Status: {latest?.status || 'No Records'}</Badge>
                        </div>
                    </div>
                    <div className="absolute right-[-30px] top-[-30px] text-[180px] opacity-10 rotate-12">💰</div>
                </div>

                <Card variant="glass" className="p-6 gap-4">
                    <div className="mb-4">
                        <div className="text-sm text-text-3 uppercase font-semibold">UAN Number</div>
                        <div className="text-[18px] font-mono font-bold text-text tracking-wider">
                            {latest?.accountNumber ? "100" + latest.accountNumber.replace(/\D/g, '') : "Pending Verification"}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-text-3 uppercase font-semibold">PF Account No</div>
                        <div className="text-[18px] font-mono font-bold text-text break-all">
                            {latest?.accountNumber || "Not Linked"}
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="px-5 py-4 flex items-center justify-between border-b border-border bg-surface-2 backdrop-blur-md">
                    <div className="text-md font-bold text-text">📄 Monthly Ledger</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2 backdrop-blur-md">
                                {['Month', 'Your Share (12%)', 'Employer Share (12%)', 'Total Credit', 'Status'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-[0.5px]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading ? records.map((rec) => (
                                <tr key={rec.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                    <td className="px-4 py-3 font-mono text-base text-text">{rec.month}</td>
                                    <td className="px-4 py-3 font-mono text-base font-semibold text-success">${rec.employeeContribution.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-base font-semibold text-success">${rec.employerContribution.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-md font-bold text-accent">${rec.totalContribution.toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                rec.status === 'Credited' ? 'success' :
                                                rec.status === 'Pending' ? 'info' :
                                                'neutral'
                                            }
                                        >
                                            {rec.status === 'Credited' && '✓ '} {rec.status}
                                        </Badge>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-text-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <Spinner /> Loading ledger...
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && records.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            title="No PF records found"
                                            description="Your provident fund records will appear here once they are available."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
