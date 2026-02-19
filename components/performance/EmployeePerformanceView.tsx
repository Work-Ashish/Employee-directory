import { cn } from "@/lib/utils"

const myGoals = [
    { goal: "Complete React Certification", deadline: "Mar 31, 2026", status: "In Progress", progress: 65, color: "from-[#3b82f6] to-[#1d4ed8]" },
    { goal: "Deliver Project X", deadline: "Apr 15, 2026", status: "On Track", progress: 40, color: "from-[#10b981] to-[#047857]" },
    { goal: "Team Mentorship", deadline: "Continuous", status: "Active", progress: 100, color: "from-[#f59e0b] to-[#b45309]" },
]

export function EmployeePerformanceView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Performance</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Review your goals and manager feedback</p>
            </div>

            <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
                {/* Rating Card */}
                <div className="glass p-8 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                        <div className="text-[13px] font-medium text-white/80 uppercase tracking-wider mb-2">Overall Rating</div>
                        <div className="flex items-end gap-3 mb-4">
                            <div className="text-[64px] font-extrabold leading-none">4.5</div>
                            <div className="text-[24px] font-bold mb-2">/ 5.0</div>
                        </div>
                        <div className="flex gap-1 mb-6">
                            {'★'.repeat(4)}<span className="opacity-50">★</span>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-[13px] font-semibold backdrop-blur-md">
                            <span>🎉</span> Excellent Performance
                        </div>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] text-[200px] opacity-10 rotate-12">⭐</div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="glass p-6 flex-1 flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-2xl mb-3">
                            🏆
                        </div>
                        <div className="text-[24px] font-extrabold text-[var(--text)]">Top 10%</div>
                        <div className="text-[12px] text-[var(--text3)]">Percentile Rank</div>
                    </div>
                    <div className="glass p-6 flex-1 flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-2xl mb-3">
                            💬
                        </div>
                        <div className="text-[24px] font-extrabold text-[var(--text)]">12</div>
                        <div className="text-[12px] text-[var(--text3)]">Feedbacks Received</div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold text-[var(--text)]">🎯 My Objectives (OKRs)</div>
                </div>
                <div className="p-6 grid gap-6">
                    {myGoals.map((g, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between mb-2">
                                    <div className="font-semibold text-[14px] text-[var(--text)]">{g.goal}</div>
                                    <div className="text-[12px] font-semibold text-[var(--text3)]">{g.status}</div>
                                </div>
                                <div className="w-full h-[8px] bg-[var(--bg2)] rounded-[4px] overflow-hidden">
                                    <div className={cn("h-full rounded-[4px]", "bg-gradient-to-r", g.color)} style={{ width: `${g.progress}%` }} />
                                </div>
                            </div>
                            <div className="text-[13px] font-mono font-bold text-[var(--text)] w-[40px] text-right">{g.progress}%</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
