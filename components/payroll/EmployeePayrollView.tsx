import { cn } from "@/lib/utils"
import { DownloadIcon } from "@radix-ui/react-icons"

const myPayslips = [
    { month: "Jan 2026", daysWorked: 31, gross: "$1,35,000", deductions: "-$31,400", net: "$1,03,600", status: "Paid" },
    { month: "Dec 2025", daysWorked: 30, gross: "$1,35,000", deductions: "-$31,400", net: "$1,03,600", status: "Paid" },
    { month: "Nov 2025", daysWorked: 30, gross: "$1,35,000", deductions: "-$31,400", net: "$1,03,600", status: "Paid" },
]

export function EmployeePayrollView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Payslips</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">View and download your monthly salary slips</p>
            </div>

            <div className="glass p-8 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden mb-8">
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="text-[13px] font-medium text-white/80 uppercase tracking-wider mb-2">Last Disbursed Salary</div>
                        <div className="text-[48px] font-extrabold leading-none mb-1">$1,03,600</div>
                        <div className="text-[14px] text-white/90 font-medium">Credited on Jan 31, 2026</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[13px] text-white/80 mb-1">Gross Earnings</div>
                        <div className="text-[18px] font-bold mb-3">$1,35,000</div>
                        <div className="text-[13px] text-white/80 mb-1">Total Deductions</div>
                        <div className="text-[18px] font-bold">-$31,400</div>
                    </div>
                </div>
                <div className="absolute right-[-40px] top-[-40px] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px]" />
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold text-[var(--text)]">📄 Payslip History</div>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Month', 'Days Worked', 'Gross Earnings', 'Deductions', 'Net Salary', 'Status', 'Action'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {myPayslips.map((slip, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0">
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{slip.month}</td>
                                <td className="p-[13px_18px] text-[13px] text-[var(--text2)]">{slip.daysWorked} Days</td>
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--green)]">{slip.gross}</td>
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--red)]">{slip.deductions}</td>
                                <td className="p-[13px_18px] font-mono text-[14px] font-bold text-[var(--accent)]">{slip.net}</td>
                                <td className="p-[13px_18px]">
                                    <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[var(--green-dim)] text-[#1a9140] border border-[rgba(52,199,89,0.25)]">
                                        ✓ {slip.status}
                                    </span>
                                </td>
                                <td className="p-[13px_18px]">
                                    <button className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">
                                        <DownloadIcon className="w-3.5 h-3.5" /> PDF
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
                <div className="glass p-6">
                    <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">Tax Breakdown</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text3)]">Income Tax (TDS)</span>
                            <span className="font-mono text-[var(--text)] font-semibold">$12,000</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text3)]">Professional Tax</span>
                            <span className="font-mono text-[var(--text)] font-semibold">$200</span>
                        </div>
                        <div className="w-full h-[1px] bg-[var(--border)] my-2" />
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text)] font-bold">Total Tax</span>
                            <span className="font-mono text-[var(--text)] font-bold">$12,200</span>
                        </div>
                    </div>
                </div>
                <div className="glass p-6">
                    <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">Bank Details</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text3)]">Bank Name</span>
                            <span className="text-[var(--text)] font-semibold">HDFC Bank</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text3)]">Account Number</span>
                            <span className="font-mono text-[var(--text)] font-semibold">**** **** 4589</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-[var(--text3)]">IFSC Code</span>
                            <span className="font-mono text-[var(--text)] font-semibold">HDFC0001234</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
