import { cn } from "@/lib/utils"

const payrollRecords = [
    { name: "John Doe", month: "Jan 2026", basic: "$1,20,000", allowances: "+$15,000", pf: "-$14,400", tax: "-$12,000", other: "-$5,000", net: "$1,03,600", status: "Paid", initials: "JD", color: "from-[#3395ff] to-[#007aff]" },
    { name: "Jane Smith", month: "Jan 2026", basic: "$95,000", allowances: "+$12,000", pf: "-$11,400", tax: "-$8,500", other: "-$3,000", net: "$84,100", status: "Paid", initials: "JS", color: "from-[#f59e0b] to-[#d97706]" },
]

export function AdminPayrollView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Payroll Management</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage salary disbursements and payslips</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total Payroll</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#1a9140] mb-[4px]">$1,87,700</div>
                        <div className="text-[12px] text-[#1a9140]">Net disbursement</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">💵</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total Allowances</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#0a7ea4] mb-[4px]">$27,000</div>
                        <div className="text-[12px] text-[#0a7ea4]">↑ Additional benefits</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--blue-dim)] shrink-0">📈</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total Deductions</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[var(--red)] mb-[4px]">$54,300</div>
                        <div className="text-[12px] text-[var(--red)]">↘ PF, Tax & Others</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,59,48,0.1)] shrink-0">📉</div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📋 Payroll Records</div>
                    <button className="text-[12.5px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">⬇ Download Payslips</button>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Employee', 'Month', 'Basic', 'Allowances', 'PF', 'Tax', 'Other', 'Net Salary', 'Status', 'Action'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {payrollRecords.map((rec, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.05}s` }}>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                    <div className="flex items-center gap-[11px]">
                                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br", rec.color)}>
                                            {rec.initials}
                                        </div>
                                        <span className="font-semibold">{rec.name}</span>
                                    </div>
                                </td>
                                <td className="p-[13px_18px]">
                                    <span className="inline-block px-[10px] py-[3px] border border-[var(--border)] rounded-[6px] text-[12px] text-[var(--text3)] bg-[var(--bg)] font-mono">
                                        {rec.month}
                                    </span>
                                </td>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text2)]">{rec.basic}</td>
                                <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[#1a9140]">{rec.allowances}</td>
                                <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[var(--red)]">{rec.pf}</td>
                                <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[var(--red)]">{rec.tax}</td>
                                <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[var(--red)]">{rec.other}</td>
                                <td className="p-[13px_18px] text-[14px] font-extrabold font-mono text-[var(--accent)]">{rec.net}</td>
                                <td className="p-[13px_18px]">
                                    <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[var(--green-dim)] text-[#1a9140] border border-[rgba(52,199,89,0.25)]">
                                        {rec.status}
                                    </span>
                                </td>
                                <td className="p-[13px_18px]">
                                    <button className="text-[12px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">📋 View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-[1fr_1fr] gap-[16px] mt-[20px]">
                <div className="glass p-[22px]">
                    <div className="text-[13.5px] font-bold text-[#1a9140] flex items-center gap-2 mb-[16px]">
                        <span>📈</span> Earnings
                    </div>
                    <div className="flex justify-between items-center py-[12px] border-b border-[var(--border)]">
                        <span className="text-[13.5px] text-[var(--text3)]">Basic Salary</span>
                        <span className="text-[13.5px] font-semibold text-[var(--text2)]">Primary component</span>
                    </div>
                    <div className="flex justify-between items-center py-[12px]">
                        <span className="text-[13.5px] text-[var(--text3)]">Allowances</span>
                        <span className="text-[13.5px] font-semibold text-[var(--text2)]">HRA, DA, Transport</span>
                    </div>
                </div>
                <div className="glass p-[22px]">
                    <div className="text-[13.5px] font-bold text-[var(--red)] flex items-center gap-2 mb-[16px]">
                        <span>📉</span> Deductions
                    </div>
                    <div className="flex justify-between items-center py-[12px] border-b border-[var(--border)]">
                        <span className="text-[13.5px] text-[var(--text3)]">Provident Fund</span>
                        <span className="text-[13.5px] font-semibold text-[var(--text2)]">12% of basic</span>
                    </div>
                    <div className="flex justify-between items-center py-[12px]">
                        <span className="text-[13.5px] text-[var(--text3)]">Income Tax</span>
                        <span className="text-[13.5px] font-semibold text-[var(--text2)]">As per slab</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
