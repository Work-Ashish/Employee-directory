import { cn } from "@/lib/utils"
import { ClockIcon, CalendarIcon } from "@radix-ui/react-icons"

const myAttendance = [
    { date: "Feb 19, 2026", in: "09:00 AM", out: "06:00 PM", hours: "9.0h", status: "Present" },
    { date: "Feb 18, 2026", in: "09:12 AM", out: "06:15 PM", hours: "9.05h", status: "Present" },
    { date: "Feb 17, 2026", in: "09:00 AM", out: "06:00 PM", hours: "9.0h", status: "Present" },
    { date: "Feb 16, 2026", in: "--", out: "--", hours: "0h", status: "Absent" },
]

export function EmployeeAttendanceView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Attendance</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track your daily logs and work hours</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase">Avg Check-in</div>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <ClockIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)]">09:04 AM</div>
                    <div className="text-[12px] text-green-500 mt-1">On Time</div>
                </div>

                <div className="glass p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase">Work Hours</div>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <span className="font-bold">H</span>
                        </div>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)]">168h</div>
                    <div className="text-[12px] text-[var(--text3)] mt-1">This month</div>
                </div>

                <div className="glass p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase">Attendance</div>
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[28px] font-extrabold text-[var(--text)]">95%</div>
                    <div className="text-[12px] text-green-500 mt-1">Excellent</div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold text-[var(--text)]">📅 My Logs</div>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Date', 'Check In', 'Check Out', 'Hours', 'Status'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {myAttendance.map((rec, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0">
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{rec.date}</td>
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{rec.in}</td>
                                <td className="p-[13px_18px] font-mono text-[13px] text-[var(--text)]">{rec.out}</td>
                                <td className="p-[13px_18px] font-bold text-[var(--accent)]">{rec.hours}</td>
                                <td className="p-[13px_18px]">
                                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                                        rec.status === 'Present'
                                            ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                                            : "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.25)]"
                                    )}>
                                        {rec.status === 'Present' ? '✓' : '✕'} {rec.status}
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
