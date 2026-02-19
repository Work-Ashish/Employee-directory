"use client"

import { cn } from "@/lib/utils"

const resignations = [
    { name: "John Doe", role: "Sr. Software Engineer", dept: "Engineering", reason: "Better Opportunity", lastDay: "Mar 15, 2026", status: "Notice Period", statusColor: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]", reasonColor: "bg-[var(--blue-dim)] text-[#0a7ea4] border-[rgba(50,173,230,0.25)]", initials: "JD", color: "from-[#3395ff] to-[#007aff]" },
    { name: "Lisa Anderson", role: "Content Strategist", dept: "Marketing", reason: "Compensation", lastDay: "Feb 28, 2026", status: "Under Review", statusColor: "bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border-[rgba(0,122,255,0.18)]", reasonColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", initials: "LA", color: "from-[#ec4899] to-[#f43f5e]" },
    { name: "Emily Brown", role: "HR Director", dept: "HR", reason: "Relocation", lastDay: "Jan 31, 2026", status: "Processed", statusColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", reasonColor: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]", initials: "EB", color: "from-[#10b981] to-[#059669]" },
    { name: "Amanda Thomas", role: "Sales Director", dept: "Sales", reason: "Career Growth", lastDay: "Dec 20, 2025", status: "Processed", statusColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", reasonColor: "bg-[rgba(90,200,250,0.12)] text-[#0077a8] border-[rgba(90,200,250,0.25)]", initials: "AT", color: "from-[#f43f5e] to-[#e11d48]" },
    { name: "David Wilson", role: "Financial Analyst", dept: "Finance", reason: "Work-Life Balance", lastDay: "Nov 30, 2025", status: "Processed", statusColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", reasonColor: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]", initials: "DW", color: "from-[#38bdf8] to-[#0ea5e9]" },
]

export default function Resignation() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Resignation Tracker</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Monitor exit trends, reasons, and attrition risk across your organisation</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[var(--red)] uppercase tracking-[0.6px] mb-[6px]">High Risk</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[var(--red)]">2</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">Active resignations</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35">🚨</div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-[0.6px] mb-[6px]">Notice Period</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber)]">1</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">In notice period</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35">⏳</div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[#1a9140] uppercase tracking-[0.6px] mb-[6px]">Completed</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140]">3</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">Successfully exited</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35">✅</div>
                </div>
                <div className="glass p-[22px]">
                    <div className="text-[11px] font-bold text-[var(--text3)] uppercase tracking-[0.6px] mb-[8px]">Attrition Rate</div>
                    <div className="text-[36px] font-extrabold text-[var(--accent)] tracking-[-1px]">8.3%</div>
                    <div className="text-[12px] text-[var(--text3)] mt-[4px]">YTD — industry avg 12%</div>
                    <div className="h-[8px] rounded-[5px] bg-[var(--bg2)] overflow-hidden mt-[10px]">
                        <div className="h-full rounded-[5px] bg-gradient-to-r from-[var(--green)] to-[var(--accent)] w-[35%]"></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[1.6fr_1fr] gap-[16px] mb-[20px]">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                    <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                        <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📋 Resignation Records</div>
                        <div className="flex gap-[8px]">
                            <select className="p-[6px_12px] text-[12px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] cursor-pointer outline-none">
                                <option>All Status</option><option>Pending</option><option>Notice Period</option><option>Approved</option>
                            </select>
                            <button className="btn btn-ghost py-[6px] px-[14px] text-[12.5px]">⬇ Export</button>
                        </div>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                {['Employee', 'Department', 'Reason', 'Last Day', 'Status', 'Action'].map((h) => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {resignations.map((res, i) => (
                                <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.05}s` }}>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                        <div className="flex items-center gap-[11px]">
                                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br", res.color)}>
                                                {res.initials}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-[13.5px]">{res.name}</div>
                                                <div className="text-[11.5px] text-[var(--text3)]">{res.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border border-[rgba(0,122,255,0.18)]">
                                            {res.dept}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[6px] text-[12px] font-semibold border", res.reasonColor)}>
                                            {res.reason}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px] text-[12.5px] text-[var(--text2)] font-mono">{res.lastDay}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border", res.statusColor)}>
                                            {res.status === 'Notice Period' && '⏳'} {res.status === 'Under Review' && '🔵'} {res.status === 'Processed' && '✓'} {res.status}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <div className="flex items-center gap-[6px]">
                                            <button className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">👁</button>
                                            <button className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">{res.status === 'Processed' ? '📄' : '✓'}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="glass p-[22px] rounded-[var(--r)]">
                    <div className="text-[13.5px] font-bold text-[var(--text)] mb-[12px]">📊 Resignation Reasons</div>
                    <div className="flex flex-col gap-[10px]">
                        <ReasonRow label="Better Opportunity" count={4} pct={80} color="linear-gradient(90deg,var(--blue),#60a5fa)" delay="0.4s" />
                        <ReasonRow label="Compensation" count={3} pct={60} color="linear-gradient(90deg,var(--green),#34d399)" delay="0.5s" />
                        <ReasonRow label="Work-Life Balance" count={2} pct={40} color="linear-gradient(90deg,var(--amber),#fbbf24)" delay="0.6s" />
                        <ReasonRow label="Career Growth" count={2} pct={40} color="linear-gradient(90deg,var(--cyan),#22d3ee)" delay="0.7s" />
                        <ReasonRow label="Relocation" count={1} pct={20} color="linear-gradient(90deg,#af52de,#af52de)" delay="0.8s" />
                        <ReasonRow label="Culture Fit" count={1} pct={20} color="linear-gradient(90deg,var(--red),#fb7185)" delay="0.9s" />
                    </div>

                    <div className="mt-[22px] pt-[18px] border-t border-[var(--border)]">
                        <div className="text-[13px] font-bold text-[var(--text)] mb-[12px]">😊 Exit Sentiment Score</div>
                        <div className="flex items-center justify-between mb-[6px]">
                            <span className="text-[12px] text-[var(--text3)]">Overall Experience</span>
                            <span className="text-[13px] font-bold text-[var(--amber)] font-mono">3.4 / 5</span>
                        </div>
                        <div className="h-[8px] rounded-[5px] bg-[var(--bg2)] overflow-hidden mb-[4px]">
                            <div className="h-full rounded-[5px] bg-gradient-to-r from-[var(--red)] via-[var(--amber)] to-[var(--green)] w-[68%]" />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--text3)]"><span>Negative</span><span>Positive</span></div>
                    </div>

                    <div className="mt-[18px] pt-[18px] border-t border-[var(--border)]">
                        <div className="text-[13px] font-bold text-[var(--text)] mb-[10px]">⚠️ At-Risk Employees</div>
                        <div className="flex flex-col gap-[8px]">
                            <div className="flex items-center gap-[10px] p-[9px] bg-[rgba(244,63,94,0.07)] border border-[rgba(244,63,94,0.2)] rounded-[9px]">
                                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-[#a78bfa] to-[#5856d6]">SD</div>
                                <div><div className="text-[12.5px] font-semibold">Sarah Davis</div><div className="text-[11px] text-[var(--text3)]">No raise in 18 months</div></div>
                                <div className="ml-auto text-[10.5px] font-bold text-[var(--red)] bg-[var(--red-dim)] px-[8px] py-[2px] rounded-[20px]">HIGH</div>
                            </div>
                            <div className="flex items-center gap-[10px] p-[9px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] rounded-[9px]">
                                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-[#f59e0b] to-[#d97706]">JS</div>
                                <div><div className="text-[12.5px] font-semibold">Jane Smith</div><div className="text-[11px] text-[var(--text3)]">Low engagement score</div></div>
                                <div className="ml-auto text-[10.5px] font-bold text-[var(--amber)] bg-[var(--amber-dim)] px-[8px] py-[2px] rounded-[20px]">MED</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ReasonRow({ label, count, pct, color, delay }: any) {
    return (
        <div className="flex items-center gap-[12px]">
            <div className="text-[12.5px] text-[var(--text2)] w-[130px] shrink-0">{label}</div>
            <div className="flex-1 h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                <div className="h-full rounded-[3px] animate-[growBar_0.8s_both] origin-left scale-x-0" style={{ width: `${pct}%`, background: color, animationDelay: delay }} />
            </div>
            <div className="text-[12px] font-mono text-[var(--text3)] w-[20px] text-right">{count}</div>
        </div>
    )
}
