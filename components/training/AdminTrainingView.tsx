import { cn } from "@/lib/utils"

const trainings = [
    { name: "Cybersecurity Awareness", type: "Security", status: "In Progress", progress: 65, dueDate: "Feb 28, 2026", participants: 124, icon: "🔒", color: "from-[#ef4444] to-[#b91c1c]", bg: "bg-[rgba(239,68,68,0.1)]", text: "text-[#ef4444]" },
    { name: "Respect in the Workplace", type: "Compliance", status: "Completed", progress: 100, dueDate: "Jan 31, 2026", participants: 150, icon: "🤝", color: "from-[#10b981] to-[#047857]", bg: "bg-[rgba(16,185,129,0.1)]", text: "text-[#10b981]" },
    { name: "Advanced React Patterns", type: "Technical", status: "Upcoming", progress: 0, dueDate: "Mar 15, 2026", participants: 18, icon: "⚛️", color: "from-[#3b82f6] to-[#1d4ed8]", bg: "bg-[rgba(59,130,246,0.1)]", text: "text-[#3b82f6]" },
]

function LearnerRow({ name, courses, score, rank }: any) {
    return (
        <div className="flex items-center gap-[12px] pb-[10px] border-b border-[var(--border)] last:border-0 last:pb-0">
            <div className={cn("w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0",
                rank === 1 ? "bg-[#eab308]" : (rank === 2 ? "bg-[#94a3b8]" : "bg-[#b45309]")
            )}>
                {rank}
            </div>
            <div className="flex-1">
                <div className="text-[13px] font-semibold text-[var(--text)]">{name}</div>
                <div className="text-[11px] text-[var(--text3)]">{courses} courses completed</div>
            </div>
            <div className="text-[13px] font-mono font-bold text-[var(--green)]">
                {score}
            </div>
        </div>
    )
}

export function AdminTrainingView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Learning & Development</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Assign and track employee training modules</p>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-[20px]">
                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[24px] bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div>
                                <h2 className="text-[20px] font-bold mb-1">Q1 Compliance Training</h2>
                                <p className="text-[13.5px] text-white/80 max-w-[400px]">New mandatory modules on Data Privacy and Ethics are now live. Please ensure all teams complete them by March 31st.</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="px-[16px] py-[8px] bg-white text-[var(--accent)] rounded-[8px] text-[13px] font-bold shadow-sm hover:bg-white/90 transition-colors">Assign to All</button>
                                <button className="px-[16px] py-[8px] bg-white/20 text-white rounded-[8px] text-[13px] font-bold hover:bg-white/30 transition-colors">View Details</button>
                            </div>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] bg-white/10 rounded-full blur-[40px]" />
                        <div className="absolute left-[-40px] bottom-[-40px] w-[150px] h-[150px] bg-black/10 rounded-full blur-[30px]" />
                        <div className="absolute right-[40px] bottom-[20px] text-[80px] opacity-20 rotate-12">🎓</div>
                    </div>

                    <div>
                        <div className="text-[15px] font-bold text-[var(--text)] mb-[14px] flex items-center justify-between">
                            <span>Active Courses</span>
                            <span className="text-[12.5px] text-[var(--accent)] font-medium cursor-pointer">View All</span>
                        </div>
                        <div className="flex flex-col gap-[12px]">
                            {trainings.map((t, i) => (
                                <div key={i} className="glass p-[18px] flex items-center gap-[16px] group transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className={cn("w-[48px] h-[48px] rounded-[12px] flex items-center justify-center text-[24px] shrink-0", t.bg)}>
                                        {t.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-[14px] font-bold text-[var(--text)]">{t.name}</h3>
                                            <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]",
                                                t.status === 'Completed' ? "bg-[var(--green-dim)] text-[#1a9140]" : (t.status === 'In Progress' ? "bg-[var(--amber-dim)] text-[#b86c00]" : "bg-[var(--blue-dim)] text-[#0a7ea4]")
                                            )}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <div className="text-[12px] text-[var(--text3)] mb-[8px] flex items-center gap-[10px]">
                                            <span>{t.type}</span>
                                            <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                            <span>Due: {t.dueDate}</span>
                                            <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                            <span>👥 {t.participants} enrolled</span>
                                        </div>
                                        <div className="w-full h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                            <div className={cn("h-full rounded-[3px] bg-gradient-to-r", t.color)} style={{ width: `${t.progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[22px]">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px] flex items-center gap-2">
                            <span>📊</span> Completion Rate
                        </div>
                        <div className="flex items-center justify-center relative mb-[10px]">
                            <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                                <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="12" />
                                <circle cx="70" cy="70" r="58" fill="none" stroke="var(--green)" strokeWidth="12" strokeDasharray="364" strokeDashoffset="91" strokeLinecap="round" className="animate-[drawDonut_1s_both]" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[28px] font-extrabold text-[var(--text)]">75%</span>
                                <span className="text-[11px] text-[var(--text3)] uppercase font-semibold">Overall</span>
                            </div>
                        </div>
                        <div className="flex justify-between text-[11.5px] text-[var(--text3)] mt-2">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-[var(--text)] text-[14px]">85%</span>
                                <span>Technical</span>
                            </div>
                            <div className="w-[1px] h-[30px] bg-[var(--border)]" />
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-[var(--text)] text-[14px]">92%</span>
                                <span>Compliance</span>
                            </div>
                            <div className="w-[1px] h-[30px] bg-[var(--border)]" />
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-[var(--text)] text-[14px]">64%</span>
                                <span>Soft Skills</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-[22px] flex-1">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px] flex items-center gap-2">
                            <span>🏆</span> Top Learners
                        </div>
                        <div className="flex flex-col gap-[12px]">
                            <LearnerRow name="Lisa Anderson" courses={8} score={98} rank={1} />
                            <LearnerRow name="James Taylor" courses={7} score={95} rank={2} />
                            <LearnerRow name="John Doe" courses={6} score={92} rank={3} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
