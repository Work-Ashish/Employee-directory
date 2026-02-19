import { cn } from "@/lib/utils"

const leaveRequests = [
    { name: "John Doe", type: "Casual", days: "3 days", dates: "Feb 25 – Feb 27", reason: "Personal work", status: "Pending", initials: "JD", color: "from-[#3395ff] to-[#007aff]", typeColor: "bg-[var(--blue-dim)] text-[#0a7ea4]" },
    { name: "Jane Smith", type: "Sick", days: "2 days", dates: "Feb 20 – Feb 21", reason: "Medical checkup", status: "Approved", initials: "JS", color: "from-[#f59e0b] to-[#d97706]", typeColor: "bg-[var(--red-dim)] text-[var(--red)]" },
    { name: "Michael Johnson", type: "Earned", days: "6 days", dates: "Mar 10 – Mar 15", reason: "Family vacation", status: "Approved", initials: "MJ", color: "from-[#007aff] to-[#5856d6]", typeColor: "bg-[var(--green-dim)] text-[#1a9140]" },
]

export function AdminLeaveView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Leave Management</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Review and approve employee leave requests</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Pending Requests</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber)] animate-[countUp_0.5s_0.1s_both]">1</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,149,0,0.12)] shrink-0">⏳</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--amber)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Approved</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140] animate-[countUp_0.5s_0.2s_both]">2</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">✅</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--green)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Rejected</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--red)] animate-[countUp_0.5s_0.3s_both]">0</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,59,48,0.1)] shrink-0">❌</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--red)] to-transparent" />
                </div>
            </div>

            <div className="flex items-center gap-[12px] mb-[18px]">
                <select className="p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] cursor-pointer outline-none transition-all duration-200 shadow-sm hover:border-[var(--border2)]">
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                </select>
                <span className="text-[12.5px] text-[var(--text3)]">Showing 3 of 3 requests</span>
                <div className="ml-auto">
                    <button className="btn btn-primary">+ New Request</button>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📅 Leave Requests</div>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Employee', 'Type', 'Duration', 'Days', 'Reason', 'Status', 'Actions'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {leaveRequests.map((req, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.05}s` }}>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                    <div className="flex items-center gap-[11px]">
                                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br", req.color)}>
                                            {req.initials}
                                        </div>
                                        <span className="font-semibold">{req.name}</span>
                                    </div>
                                </td>
                                <td className="p-[13px_18px]">
                                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border border-transparent", req.typeColor)}>
                                        {req.type}
                                    </span>
                                </td>
                                <td className="p-[13px_18px] text-[12.5px] text-[var(--text2)] font-mono">{req.dates}</td>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text2)]">{req.days}</td>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text3)]">{req.reason}</td>
                                <td className="p-[13px_18px]">
                                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                                        req.status === 'Approved'
                                            ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                                            : (req.status === 'Pending' ? "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]" : "")
                                    )}>
                                        {req.status === 'Pending' ? '⏳' : '✓'} {req.status}
                                    </span>
                                </td>
                                <td className="p-[13px_18px]">
                                    {req.status === 'Pending' ? (
                                        <div className="flex items-center gap-[6px]">
                                            <button className="flex items-center gap-1 px-[14px] py-[6px] text-[12.5px] font-semibold rounded-[8px] bg-[var(--green-dim)] text-[#1a9140] border border-[rgba(52,199,89,0.3)] hover:bg-[rgba(52,199,89,0.2)] transition-colors">✓ Approve</button>
                                            <button className="flex items-center gap-1 px-[14px] py-[6px] text-[12.5px] font-semibold rounded-[8px] bg-[var(--red-dim)] text-[var(--red)] border border-[rgba(255,59,48,0.25)] hover:bg-[rgba(255,59,48,0.15)] transition-colors">✕ Reject</button>
                                        </div>
                                    ) : (
                                        <span className="text-[12px] text-[var(--text3)]">By Admin User</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
