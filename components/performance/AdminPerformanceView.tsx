import { cn } from "@/lib/utils"

const performanceReviews = [
    { name: "John Doe", dept: "Engineering", rating: 5, ratingVal: "5.0", progress: 95, lastReview: "Jan 2026", status: "Excellent", statusColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", initials: "JD", color: "from-[#3395ff] to-[#007aff]" },
    { name: "Jane Smith", dept: "Marketing", rating: 4, ratingVal: "4.0", progress: 80, lastReview: "Jan 2026", status: "Good", statusColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", initials: "JS", color: "from-[#f59e0b] to-[#d97706]" },
    { name: "Michael Johnson", dept: "Sales", rating: 4.2, ratingVal: "4.2", progress: 84, lastReview: "Dec 2025", status: "Pending", statusColor: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]", initials: "MJ", color: "from-[#007aff] to-[#5856d6]" },
    { name: "Lisa Anderson", dept: "Marketing", rating: 3.5, ratingVal: "3.5", progress: 70, lastReview: "Dec 2025", status: "Pending", statusColor: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]", progressBarColor: "from-[var(--amber)] to-[#fbbf24]", initials: "LA", color: "from-[#ec4899] to-[#f43f5e]" },
]

export function AdminPerformanceView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Performance Management</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track and evaluate employee performance metrics</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Avg Score</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[40px] font-extrabold leading-[1] tracking-[-1px] text-[var(--accent)] animate-[countUp_0.5s_0.1s_both]">4.2</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(0,122,255,0.1)] shrink-0">⭐</div>
                    </div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Top Performers</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[40px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140] animate-[countUp_0.5s_0.2s_both]">3</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">🏆</div>
                    </div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Reviews Pending</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[40px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber)] animate-[countUp_0.5s_0.3s_both]">2</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--amber-dim)] shrink-0">📋</div>
                    </div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Goals Completed</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[32px] font-extrabold leading-[1] tracking-[-1px] text-[#0a7ea4] animate-[countUp_0.5s_0.4s_both]">78%</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--blue-dim)] shrink-0">🎯</div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📊 Performance Reviews</div>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                            {['Employee', 'Department', 'Rating', 'Progress', 'Last Review', 'Status'].map((h) => (
                                <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {performanceReviews.map((rev, i) => (
                            <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.05}s` }}>
                                <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                    <div className="flex items-center gap-[11px]">
                                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br", rev.color)}>
                                            {rev.initials}
                                        </div>
                                        <span className="font-semibold">{rev.name}</span>
                                    </div>
                                </td>
                                <td className="p-[13px_18px]">
                                    <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border border-[rgba(0,122,255,0.18)]">
                                        {rev.dept}
                                    </span>
                                </td>
                                <td className="p-[13px_18px]">
                                    <span className="text-[var(--amber)] tracking-[1px]">{'★'.repeat(Math.floor(rev.rating))}</span>
                                    <span className="text-[var(--text3)] tracking-[1px]">{'★'.repeat(5 - Math.floor(rev.rating))}</span>
                                    <span className="text-[12px] text-[var(--text3)] ml-2">{rev.ratingVal}</span>
                                </td>
                                <td className="p-[13px_18px]">
                                    <div className="w-[100px] h-[5px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-[3px] animate-[growBar_0.8s_0.4s_both] origin-left scale-x-0 bg-gradient-to-r", rev.progressBarColor || "from-[var(--accent)] to-[var(--blue)]")}
                                            style={{ width: `${rev.progress}%` }}
                                        />
                                    </div>
                                </td>
                                <td className="p-[13px_18px] text-[13px] text-[var(--text3)] font-mono">{rev.lastReview}</td>
                                <td className="p-[13px_18px]">
                                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border", rev.statusColor)}>
                                        {rev.status}
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
