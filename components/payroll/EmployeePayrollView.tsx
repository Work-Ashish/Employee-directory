import * as React from "react"
import { cn } from "@/lib/utils"
import { DownloadIcon } from "@radix-ui/react-icons"
import { toast } from "react-hot-toast"
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

export function EmployeePayrollView() {
    const [payslips, setPayslips] = React.useState<Payslip[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchPayslips = async () => {
            try {
                const res = await fetch('/api/payroll')
                if (res.ok) {
                    setPayslips(await res.json())
                }
            } catch (error) {
                toast.error("Failed to load payslips")
            } finally {
                setIsLoading(false)
            }
        }
        fetchPayslips()
    }, [])

    const latest = payslips[0]

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Payslips</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">View and download your monthly salary slips</p>
            </div>

            {latest ? (
                <div className="glass p-8 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden mb-8 shadow-lg">
                    <div className="relative z-10 flex justify-between items-end">
                        <div>
                            <div className="text-[13px] font-medium text-white/80 uppercase tracking-wider mb-2">Last Disbursed Salary ({latest.month})</div>
                            <div className="text-[48px] font-extrabold leading-none mb-1">${latest.netSalary.toLocaleString()}</div>
                            <div className="text-[14px] text-white/90 font-medium">Credited on {format(new Date(latest.createdAt), "MMM dd, yyyy")}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[13px] text-white/80 mb-1">Gross Earnings</div>
                            <div className="text-[18px] font-bold mb-3">${(latest.basicSalary + latest.allowances).toLocaleString()}</div>
                            <div className="text-[13px] text-white/80 mb-1">Total Deductions</div>
                            <div className="text-[18px] font-bold">-${(latest.pfDeduction + latest.tax + latest.otherDed).toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="absolute right-[-40px] top-[-40px] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px]" />
                </div>
            ) : (
                <div className="glass p-8 bg-[var(--surface2)] text-[var(--text3)] text-center mb-8">
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
                            {!isLoading ? payslips.map((slip, i) => (
                                <tr key={slip.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{slip.month}</td>
                                    <td className="p-[13px_18px] text-[13px] text-[var(--text2)] font-mono">${slip.basicSalary.toLocaleString()}</td>
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--green)]">+${slip.allowances.toLocaleString()}</td>
                                    <td className="p-[13px_18px] font-mono text-[13px] text-[var(--red)]">-${(slip.pfDeduction + slip.tax + slip.otherDed).toLocaleString()}</td>
                                    <td className="p-[13px_18px] font-mono text-[14px] font-bold text-[var(--accent)]">${slip.netSalary.toLocaleString()}</td>
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
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-[var(--text3)]">Loading payslips...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {latest && (
                <div className="grid grid-cols-2 gap-6 mt-6">
                    <div className="glass p-6">
                        <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">Tax Breakdown ({latest.month})</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[var(--text3)]">Income Tax (TDS)</span>
                                <span className="font-mono text-[var(--text)] font-semibold">${latest.tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[var(--text3)]">Provident Fund</span>
                                <span className="font-mono text-[var(--text)] font-semibold">${latest.pfDeduction.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[var(--text3)]">Other Deductions</span>
                                <span className="font-mono text-[var(--text)] font-semibold">${latest.otherDed.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-[1px] bg-[var(--border)] my-2" />
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[var(--text)] font-bold">Total Deductions</span>
                                <span className="font-mono text-[var(--red)] font-bold">-${(latest.tax + latest.pfDeduction + latest.otherDed).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="glass p-6 bg-[var(--surface2)] border-dashed">
                        <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">Calculation Logic</h3>
                        <p className="text-[12.5px] text-[var(--text3)] leading-relaxed">
                            Net Salary is calculated as: <br />
                            <span className="font-bold text-[var(--text2)]">Basic + Allowances - Deductions</span>. <br /><br />
                            Deductions include PF withholding, Income Tax (TDS), and any other specific employee adjustments.
                            Payslips are typically disbursed on the last working day of the month.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
