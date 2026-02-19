import { cn } from "@/lib/utils"

const attendanceRecords = [
    { name: "John Doe", date: "Feb 19, 2026", in: "09:15 AM", out: "06:30 PM", hours: "9.3h", status: "Present", initials: "JD", color: "from-[#3395ff] to-[#007aff]" },
    { name: "Jane Smith", date: "Feb 19, 2026", in: "09:00 AM", out: "06:00 PM", hours: "9.0h", status: "Present", initials: "JS", color: "from-[#f59e0b] to-[#d97706]" },
    { name: "Michael Johnson", date: "Feb 19, 2026", in: "10:30 AM", out: "02:00 PM", hours: "3.5h", status: "Half Day", initials: "MJ", color: "from-[#007aff] to-[#5856d6]" },
]

export function AdminAttendanceView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Attendance Tracking</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track daily attendance and work hours</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Present</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140] animate-[countUp_0.5s_0.1s_both]">2</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">✅</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--green)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Absent</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--red)] animate-[countUp_0.5s_0.2s_both]">0</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,59,48,0.1)] shrink-0">❌</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--red)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Half Day</div>
                        <div className="text-[38px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber)] animate-[countUp_0.5s_0.3s_both]">1</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,149,0,0.12)] shrink-0">⏰</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--amber)] to-transparent" />
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[6px]">Total Hours</div>
                        <div className="text-[30px] font-extrabold leading-[1] tracking-[-1px] text-[#0a7ea4] animate-[countUp_0.5s_0.4s_both]">21.8</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--blue-dim)] shrink-0">⏱️</div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--blue)] to-transparent" />
                </div>
            </div>

            <div className="flex items-center gap-[12px] mb-[18px]">
                <select className="p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] cursor-pointer outline-none transition-all duration-200 shadow-sm hover:border-[var(--border2)]">
                    <option>All Status</option>
                    <option>Present</option>
                    <option>Absent</option>
                    <option>Half Day</option>
                </select>
                <span className="text-[12.5px] text-[var(--text3)]">Showing 3 of 3 records</span>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm mb-5">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📅 Attendance Records</div>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Employee', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceRecords.map((rec, i) => (
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
                                        {rec.date}
                                    </span>
                                </td>
                                <td className="p-[13px_18px] text-[13px] text-[var(--text)] font-mono">
                                    <div className="flex items-center gap-[6px]">
                                        <span className="text-[var(--green)] text-[10px]">●</span> {rec.in}
                                    </div>
                                </td>
                                <td className="p-[13px_18px] text-[13px] text-[var(--text)] font-mono">
                                    <div className="flex items-center gap-[6px]">
                                        <span className="text-[var(--red)] text-[10px]">●</span> {rec.out}
                                    </div>
                                </td>
                                <td className="p-[13px_18px]">
                                    <span className="font-bold text-[var(--accent)] font-mono">{rec.hours}</span>
                                </td>
                                <td className="p-[13px_18px]">
                                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                                        rec.status === 'Present'
                                            ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                                            : (rec.status === 'Half Day' ? "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]" : "")
                                    )}>
                                        {rec.status === 'Present' ? '✓' : '⏰'} {rec.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="glass p-[22px]">
                <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center gap-2 mb-[16px]">
                    <span>📋</span> Attendance Policy
                </div>
                <div className="flex flex-col gap-[12px]">
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--green)] shadow-[0_0_6px_var(--green)]" />
                        Standard work hours: 9 hours per day (with 1 hour break)
                    </div>
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--amber)] shadow-[0_0_6px_var(--amber)]" />
                        Half-day: Less than 5 hours of work
                    </div>
                    <div className="flex items-start gap-[10px] text-[13.5px] text-[var(--text2)]">
                        <div className="w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                        Overtime: Work hours beyond 9 hours will be compensated
                    </div>
                </div>
            </div>
        </div>
    )
}
