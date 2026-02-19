import { cn } from "@/lib/utils"

const myPFCheck = [
    { month: "Jan 2026", emp: "$14,400", employer: "$14,400", total: "$28,800", status: "Credited" },
    { month: "Dec 2025", emp: "$14,400", employer: "$14,400", total: "$28,800", status: "Credited" },
    { month: "Nov 2025", emp: "$14,400", employer: "$14,400", total: "$28,800", status: "Credited" },
]

export function EmployeePFView() {
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
                        <div className="text-[48px] font-extrabold leading-none mb-4">$51,600</div>
                        <div className="flex gap-4 text-[13px] text-white/90">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Earned Interest: $1,200</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">Last Credit: Jan 31</span>
                        </div>
                    </div>
                    <div className="absolute right-[-30px] top-[-30px] text-[180px] opacity-10 rotate-12">💰</div>
                </div>

                <div className="glass p-6 flex flex-col justify-center gap-4">
                    <div>
                        <div className="text-[12px] text-[var(--text3)] uppercase font-semibold">UAN Number</div>
                        <div className="text-[18px] font-mono font-bold text-[var(--text)]">100987654321</div>
                    </div>
                    <div>
                        <div className="text-[12px] text-[var(--text3)] uppercase font-semibold">PF Account No</div>
                        <div className="text-[18px] font-mono font-bold text-[var(--text)]">GN/GGN/1234567/000/123</div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold text-[var(--text)]">📄 Monthly Ledger</div>
                </div>
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
                        {myPFCheck.map((rec, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0">
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{rec.month}</td>
                                <td className="p-[13px_18px] font-mono text-[13px] font-semibold text-[var(--green)]">{rec.emp}</td>
                                <td className="p-[13px_18px] font-mono text-[13px] font-semibold text-[var(--green)]">{rec.employer}</td>
                                <td className="p-[13px_18px] font-mono text-[14px] font-bold text-[var(--accent)]">{rec.total}</td>
                                <td className="p-[13px_18px]">
                                    <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[var(--green-dim)] text-[#1a9140] border border-[rgba(52,199,89,0.25)]">
                                        ✓ {rec.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
