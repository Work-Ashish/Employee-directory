import { cn } from "@/lib/utils"

const pfRecords = [
    { name: "John Doe", month: "Jan 2026", accNo: "PF123456789", basic: "$1,20,000", emp: "$14,400", employer: "$14,400", total: "$28,800", status: "Credited", initials: "JD", color: "from-[#3395ff] to-[#007aff]" },
    { name: "Jane Smith", month: "Jan 2026", accNo: "PF987654321", basic: "$95,000", emp: "$11,400", employer: "$11,400", total: "$22,800", status: "Credited", initials: "JS", color: "from-[#f59e0b] to-[#d97706]" },
]

export function AdminPFView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Provident Fund</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track provident fund contributions</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Employee Contribution</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[var(--accent)] mb-[4px]">$25,800</div>
                        <div className="text-[12px] text-[var(--accent)]">This month</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(0,122,255,0.1)] shrink-0">💳</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Employer Contribution</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#7c3aed] mb-[4px]">$25,800</div>
                        <div className="text-[12px] text-[#7c3aed]">This month</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(88,86,214,0.12)] shrink-0">🏢</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total PF</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#1a9140] mb-[4px]">$51,600</div>
                        <div className="text-[12px] text-[#1a9140]">↑ Combined</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">📈</div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📄 Provident Fund Records</div>
                    <button className="text-[12.5px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">⬇ Export Report</button>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Employee', 'Month', 'Account No.', 'Basic Salary', 'Employee (12%)', 'Employer (12%)', 'Total', 'Status'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pfRecords.map((rec, i) => (
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
                                <td className="p-[13px_18px] text-[12.5px] text-[var(--text3)] font-mono">{rec.accNo}</td>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text2)]">{rec.basic}</td>
                                <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[#1a9140]">{rec.emp}</td>
                                <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[#1a9140]">{rec.employer}</td>
                                <td className="p-[13px_18px] text-[14px] font-extrabold font-mono text-[var(--accent)]">{rec.total}</td>
                                <td className="p-[13px_18px]">
                                    <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[var(--green-dim)] text-[#1a9140] border border-[rgba(52,199,89,0.25)]">
                                        {rec.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="glass p-[22px] mt-[20px]">
                <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center gap-2 mb-[16px]">
                    <span>ℹ️</span> About Provident Fund
                </div>
                <div className="flex flex-col gap-[12px]">
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                        Employee contribution is 12% of basic salary, deducted monthly from payroll
                    </div>
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--accent2)] shadow-[0_0_6px_var(--accent2)]" />
                        Employer matches with equal 12% contribution
                    </div>
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--green)] shadow-[0_0_6px_var(--green)]" />
                        Total PF accumulation provides retirement security and emergency fund access
                    </div>
                </div>
            </div>
        </div>
    )
}
