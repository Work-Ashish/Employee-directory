import { cn } from "@/lib/utils"

const myCourses = [
    { name: "Cybersecurity 101", type: "Security", status: "In Progress", progress: 45, dueDate: "Feb 28, 2026", icon: "🔒", color: "from-[#ef4444] to-[#b91c1c]", bg: "bg-[rgba(239,68,68,0.1)]" },
    { name: "React Fundamentals", type: "Technical", status: "Completed", progress: 100, dueDate: "Jan 15, 2026", icon: "⚛️", color: "from-[#3b82f6] to-[#1d4ed8]", bg: "bg-[rgba(59,130,246,0.1)]" },
]

export function EmployeeTrainingView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Learning</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Access your courses and track progress</p>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-[20px]">
                <div className="flex flex-col gap-[20px]">
                    {/* Featured Course */}
                    <div className="glass p-[24px] bg-gradient-to-br from-[#10b981] to-[#059669] text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider bg-white/20 inline-block px-2 py-1 rounded mb-2">Recommended</div>
                                <h2 className="text-[20px] font-bold mb-1">Advanced Leadership Skills</h2>
                                <p className="text-[13.5px] text-white/90 max-w-[400px]">Prepare for your next role with this comprehensive leadership track.</p>
                            </div>
                            <button className="px-[16px] py-[8px] bg-white text-[var(--green)] rounded-[8px] text-[13px] font-bold shadow-sm hover:bg-white/90 transition-colors">Start Learning</button>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] bg-white/10 rounded-full blur-[40px]" />
                        <div className="absolute right-[20px] bottom-[10px] text-[100px] opacity-20 rotate-[-12]">🚀</div>
                    </div>

                    <div>
                        <div className="text-[15px] font-bold text-[var(--text)] mb-[14px]">My Active Courses</div>
                        <div className="flex flex-col gap-[12px]">
                            {myCourses.map((t, i) => (
                                <div key={i} className="glass p-[18px] flex items-center gap-[16px] group transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md">
                                    <div className={cn("w-[48px] h-[48px] rounded-[12px] flex items-center justify-center text-[24px] shrink-0", t.bg)}>
                                        {t.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-[14px] font-bold text-[var(--text)]">{t.name}</h3>
                                            <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]",
                                                t.status === 'Completed' ? "bg-[var(--green-dim)] text-[#1a9140]" : "bg-[var(--blue-dim)] text-[#0a7ea4]"
                                            )}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <div className="text-[12px] text-[var(--text3)] mb-[8px] flex items-center gap-[10px]">
                                            <span>{t.type}</span>
                                            <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                            <span>Due: {t.dueDate}</span>
                                        </div>
                                        <div className="w-full h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                            <div className={cn("h-full rounded-[3px] bg-gradient-to-r", t.color)} style={{ width: `${t.progress}%` }} />
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] font-semibold hover:bg-[var(--bg)] transition-colors">
                                        {t.status === 'Completed' ? 'Review' : 'Continue'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[22px]">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px] flex items-center gap-2">
                            <span>🏆</span> My Achievements
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[var(--surface2)] rounded-xl border border-[var(--border)] flex flex-col items-center text-center">
                                <div className="text-2xl mb-1">🥇</div>
                                <div className="text-[12px] font-bold">Fast Learner</div>
                            </div>
                            <div className="p-3 bg-[var(--surface2)] rounded-xl border border-[var(--border)] flex flex-col items-center text-center">
                                <div className="text-2xl mb-1">🔥</div>
                                <div className="text-[12px] font-bold">3 Day Streak</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
