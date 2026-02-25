import * as React from "react"
import { cn } from "@/lib/utils"
import { DownloadIcon, ReaderIcon, ArchiveIcon } from "@radix-ui/react-icons"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"

type Payslip = {
    id: string
    month: string
    basicSalary: number
    allowances: number
    pfDeduction: number
    tax: number
    otherDed: number
    netSalary: number
    status: string
    createdAt: string
}

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

export function EmployeePayrollView() {
    const [activeTab, setActiveTab] = React.useState<"payroll" | "pf">("payroll")
    const [payslips, setPayslips] = React.useState<Payslip[]>([])
    const [pfRecords, setPfRecords] = React.useState<PFRecord[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [payRes, pfRes] = await Promise.all([
                fetch('/api/payroll'),
                fetch('/api/pf')
            ])
            if (payRes.ok && pfRes.ok) {
                setPayslips(await payRes.json())
                setPfRecords(await pfRes.json())
            }
        } catch (error) {
            toast.error("Failed to load your financial data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const latest = payslips[0]
    const totalPF = pfRecords.reduce((acc, curr) => acc + curr.totalContribution, 0)

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">
                        {activeTab === "payroll" ? "My Payslips" : "My Provident Fund"}
                    </h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">
                        {activeTab === "payroll" ? "View and download your monthly salary slips" : "Track your accumulated PF contributions and balance"}
                    </p>
                </div>
                <div className="flex bg-[var(--bg2)] p-1 rounded-xl border border-[var(--border)]">
                    <button
                        onClick={() => setActiveTab("payroll")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all outline-none",
                            activeTab === "payroll" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text3)] hover:text-[var(--text2)]"
                        )}
                    >
                        <ReaderIcon className="w-4 h-4" /> Payslips
                    </button>
                    <button
                        onClick={() => setActiveTab("pf")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all outline-none",
                            activeTab === "pf" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text3)] hover:text-[var(--text2)]"
                        )}
                    >
                        <ArchiveIcon className="w-4 h-4" /> PF
                    </button>
                </div>
            </div>

            {activeTab === "payroll" ? (
                <>
                    {latest ? (
                        <div className="glass p-8 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden mb-8 shadow-lg rounded-2xl">
                            <div className="relative z-10 flex justify-between items-end">
                                <div>
                                    <div className="text-[13px] font-medium text-white/80 uppercase tracking-wider mb-2">Last Disbursed Salary ({latest.month})</div>
                                    <div className="text-[48px] font-extrabold leading-none mb-1">₹{latest.netSalary.toLocaleString()}</div>
                                    <div className="text-[14px] text-white/90 font-medium">Credited on {format(new Date(latest.createdAt), "MMM dd, yyyy")}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[13px] text-white/80 mb-1">Gross Earnings</div>
                                    <div className="text-[18px] font-bold mb-3">₹{(latest.basicSalary + latest.allowances).toLocaleString()}</div>
                                    <div className="text-[13px] text-white/80 mb-1">Total Deductions</div>
                                    <div className="text-[18px] font-bold">-₹{(latest.pfDeduction + latest.tax + latest.otherDed).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="absolute right-[-40px] top-[-40px] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px]" />
                        </div>
                    ) : (
                        <div className="glass p-12 bg-[var(--surface2)] text-[var(--text3)] text-center mb-8 rounded-2xl italic">
                            {isLoading ? "Loading salary info..." : "No payroll records found yet."}
                        </div>
                    )}

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                        <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            <div className="text-[14px] font-bold text-[var(--text)]">📄 Payslip History</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                        {['Month', 'Basic', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Action'].map((h) => (
                                            <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {!isLoading ? payslips.map((slip) => (
                                        <tr key={slip.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                            <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{slip.month}</td>
                                            <td className="p-[13px_18px] text-[13px] text-[var(--text2)] font-mono">₹{slip.basicSalary.toLocaleString()}</td>
                                            <td className="p-[13px_18px] font-mono text-[13px] text-[var(--green)]">+₹{slip.allowances.toLocaleString()}</td>
                                            <td className="p-[13px_18px] font-mono text-[13px] text-[var(--red)]">-₹{(slip.pfDeduction + slip.tax + slip.otherDed).toLocaleString()}</td>
                                            <td className="p-[13px_18px] font-mono text-[14px] font-bold text-[var(--accent)]">₹{slip.netSalary.toLocaleString()}</td>
                                            <td className="p-[13px_18px]">
                                                <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[11px] font-semibold border",
                                                    slip.status === 'PAID' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]" :
                                                        slip.status === 'PROCESSED' ? "bg-[var(--blue-dim)] text-[#007aff] border-[rgba(0,122,255,0.25)]" :
                                                            "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]")
                                                }>
                                                    {slip.status}
                                                </span>
                                            </td>
                                            <td className="p-[13px_18px]">
                                                <button className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">
                                                    <DownloadIcon className="w-3.5 h-3.5" /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    )) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="glass p-8 bg-gradient-to-br from-[#1a9140] to-[#34c759] text-white relative overflow-hidden mb-8 shadow-lg rounded-2xl">
                        <div className="relative z-10 flex justify-between items-end">
                            <div>
                                <div className="text-[13px] font-medium text-white/80 uppercase tracking-wider mb-2">Total Accumulated Corpus</div>
                                <div className="text-[48px] font-extrabold leading-none mb-1">₹{totalPF.toLocaleString()}</div>
                                <div className="text-[14px] text-white/90 font-medium">As of {format(new Date(), "MMMM yyyy")}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[13px] text-white/80 mb-1">Total Contributions</div>
                                <div className="text-[24px] font-bold">{pfRecords.length} Months</div>
                                <div className="text-[13px] text-white/80 mt-2 mb-1">A/C Number</div>
                                <div className="text-[16px] font-mono font-bold tracking-wider">{pfRecords[0]?.accountNumber || "N/A"}</div>
                            </div>
                        </div>
                        <div className="absolute right-[-40px] top-[-40px] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px]" />
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                        <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            <div className="text-[14px] font-bold text-[var(--text)]">📁 PF Contribution Ledger</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                        {['Month', 'Basic Salary', 'Your Contrib. (12%)', 'Employer Contrib. (12%)', 'Total', 'Status'].map((h) => (
                                            <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {!isLoading ? pfRecords.map((rec) => (
                                        <tr key={rec.id} className="group hover:bg-[rgba(52,199,89,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                            <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{rec.month}</td>
                                            <td className="p-[13px_18px] text-[13px] text-[var(--text2)] font-mono">₹{rec.basicSalary.toLocaleString()}</td>
                                            <td className="p-[13px_18px] font-mono text-[13px] text-[#1a9140]">₹{rec.employeeContribution.toLocaleString()}</td>
                                            <td className="p-[13px_18px] font-mono text-[13px] text-[#1a9140]">₹{rec.employerContribution.toLocaleString()}</td>
                                            <td className="p-[13px_18px] font-mono text-[14px] font-bold text-[#007aff]">₹{rec.totalContribution.toLocaleString()}</td>
                                            <td className="p-[13px_18px]">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.3px]",
                                                    rec.status === "Credited" ? "bg-[#1a914015] text-[#1a9140]" :
                                                        rec.status === "Pending" ? "bg-[#f59e0b15] text-[#f59e0b]" :
                                                            "bg-[#ef444415] text-[#ef4444]"
                                                )}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
