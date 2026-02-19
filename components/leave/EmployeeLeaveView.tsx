import { cn } from "@/lib/utils"
import { CalendarIcon, PlusIcon } from "@radix-ui/react-icons"

const myLeaveHistory = [
    { type: "Sick", days: "1 day", dates: "Jan 12", reason: "Fever", status: "Approved", color: "bg-[var(--red-dim)] text-[var(--red)]" },
    { type: "Casual", days: "2 days", dates: "Dec 20 – Dec 21", reason: "Personal trip", status: "Approved", color: "bg-[var(--blue-dim)] text-[var(--blue)]" },
    { type: "Earned", days: "5 days", dates: "Nov 01 – Nov 05", reason: "Vacation", status: "Rejected", color: "bg-[var(--green-dim)] text-[var(--green)]" },
]

export function EmployeeLeaveView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Leave</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage your leave balance and requests</p>
                </div>
                <button className="flex items-center gap-2 p-[10px_16px] bg-[var(--accent)] text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
                    <PlusIcon className="w-4 h-4" /> Apply Leave
                </button>
            </div>

            {/* Leave Balance Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">12 Available</span>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)] mb-1">Casual Leave</div>
                    <div className="text-[12px] text-[var(--text3)]">Used: 3 / 15 days</div>
                </div>

                <div className="glass p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <span className="text-lg">🤒</span>
                        </div>
                        <span className="text-[11px] font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-full">5 Available</span>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)] mb-1">Sick Leave</div>
                    <div className="text-[12px] text-[var(--text3)]">Used: 5 / 10 days</div>
                </div>

                <div className="glass p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <span className="text-lg">✈️</span>
                        </div>
                        <span className="text-[11px] font-bold bg-green-500/10 text-green-500 px-2 py-1 rounded-full">15 Available</span>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)] mb-1">Earned Leave</div>
                    <div className="text-[12px] text-[var(--text3)]">Used: 0 / 15 days</div>
                </div>
            </div>

            {/* Request History */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <h3 className="text-[14px] font-bold text-[var(--text)]">My Request History</h3>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Leave Type', 'Dates', 'Duration', 'Reason', 'Status'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {myLeaveHistory.map((req, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0">
                                <td className="p-[13px_18px]">
                                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border border-transparent", req.color)}>
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
                                            : "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.25)]"
                                    )}>
                                        {req.status === 'Approved' ? '✓' : '✕'} {req.status}
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
