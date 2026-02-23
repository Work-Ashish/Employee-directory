import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"

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
                    setRecords(await res.json())
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
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Provident Fund</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Your savings and contributions overview</p>
            </div>

            <div className="grid grid-cols-[1.5fr_1fr] gap-6 mb-6">
                <div className="glass p-8 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-[13px] font-medium text-white/80 uppercase tracking-wider mb-2">Total Accumulated Corpus</div>
                        <div className="text-[48px] font-extrabold leading-none mb-4">${totalAccumulated.toLocaleString()}</div>
                        <div className="flex gap-4 text-[13px] text-white/90">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">Last Credit: {latest?.month || 'N/A'}</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">Status: {latest?.status || 'No Records'}</span>
                        </div>
                    </div>
                    <div className="absolute right-[-30px] top-[-30px] text-[180px] opacity-10 rotate-12">💰</div>
                </div>

                <div className="glass p-6 gap-4">
                    <div className="mb-4">
                        <div className="text-[12px] text-[var(--text3)] uppercase font-semibold">UAN Number</div>
                        <div className="text-[18px] font-mono font-bold text-[var(--text)] tracking-wider">
                            {latest?.accountNumber ? "100" + latest.accountNumber.replace(/\D/g, '') : "Pending Verification"}
                        </div>
                    </div>
                    <div>
                        <div className="text-[12px] text-[var(--text3)] uppercase font-semibold">PF Account No</div>
                        <div className="text-[18px] font-mono font-bold text-[var(--text)] break-all">
                            {latest?.accountNumber || "Not Linked"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold text-[var(--text)]">📄 Monthly Ledger</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                {['Month', 'Your Share (12%)', 'Employer Share (12%)', 'Total Credit', 'Status'].map((h) => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading ? records.map((rec, i) => (
                                <tr key={rec.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{rec.month}</td>
                                    <td className="p-[13px_18px] font-mono text-[13px] font-semibold text-[var(--green)]">${rec.employeeContribution.toLocaleString()}</td>
                                    <td className="p-[13px_18px] font-mono text-[13px] font-semibold text-[var(--green)]">${rec.employerContribution.toLocaleString()}</td>
                                    <td className="p-[13px_18px] font-mono text-[14px] font-bold text-[var(--accent)]">${rec.totalContribution.toLocaleString()}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[11px] font-semibold border",
                                            rec.status === 'Credited' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]" :
                                                rec.status === 'Pending' ? "bg-[var(--blue-dim)] text-[#007aff] border-[rgba(0,122,255,0.25)]" :
                                                    "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]")
                                        }>
                                            {rec.status === 'Credited' && '✓ '} {rec.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-[var(--text3)]">Loading ledger...</td>
                                </tr>
                            )}
                            {!isLoading && records.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-[var(--text3)]">No PF records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
