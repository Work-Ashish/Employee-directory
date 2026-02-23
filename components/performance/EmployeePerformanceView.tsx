import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { format } from "date-fns"

type PerformanceReview = {
    id: string
    rating: number
    progress: number
    comments: string
    reviewDate: string
    status: string
}

const myGoals = [
    { goal: "Complete React Certification", deadline: "Mar 31, 2026", status: "In Progress", progress: 65, color: "from-[#3b82f6] to-[#1d4ed8]" },
    { goal: "Deliver Project X", deadline: "Apr 15, 2026", status: "On Track", progress: 40, color: "from-[#10b981] to-[#047857]" },
    { goal: "Team Mentorship", deadline: "Continuous", status: "Active", progress: 100, color: "from-[#f59e0b] to-[#b45309]" },
]

export function EmployeePerformanceView() {
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await fetch('/api/performance')
                if (res.ok) {
                    setReviews(await res.json())
                }
            } catch (_error) {
                toast.error("Failed to load performance reviews")
            } finally {
                setIsLoading(false)
            }
        }
        fetchReviews()
    }, [])

    const latest = reviews[0]
    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : "0.0"

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
                            <div className="text-[64px] font-extrabold leading-none">{avgRating}</div>
                            <div className="text-[24px] font-bold mb-2">/ 5.0</div>
                        </div>
                        <div className="flex gap-1 mb-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn(i < Math.floor(Number(avgRating)) ? "text-white" : "text-white/30")}>★</span>
                            ))}
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-[13px] font-semibold backdrop-blur-md">
                            <span>{Number(avgRating) >= 4 ? "🎉" : Number(avgRating) >= 3 ? "👍" : "📈"}</span> {latest?.status || "No reviews yet"}
                        </div>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] text-[200px] opacity-10 rotate-12">⭐</div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="glass p-6 flex-1 flex flex-col justify-center items-center text-center bg-[var(--surface)] border-[var(--border)]">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-2xl mb-3">
                            🏆
                        </div>
                        <div className="text-[24px] font-extrabold text-[var(--text)]">
                            {Number(avgRating) >= 4.5 ? "Top 5%" : Number(avgRating) >= 4.0 ? "Top 15%" : "Active"}
                        </div>
                        <div className="text-[12px] text-[var(--text3)]">Performance Rank</div>
                    </div>
                    <div className="glass p-6 flex-1 flex flex-col justify-center items-center text-center bg-[var(--surface)] border-[var(--border)]">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-2xl mb-3">
                            💬
                        </div>
                        <div className="text-[24px] font-extrabold text-[var(--text)]">{reviews.length}</div>
                        <div className="text-[12px] text-[var(--text3)]">Reviews Received</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[3fr_2fr] gap-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                    <div className="p-[16px_20px] border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                        <div className="text-[14px] font-bold text-[var(--text)]">📅 Review History</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                                    {['Date', 'Rating', 'Status', 'Feedback'].map((h) => (
                                        <th key={h} className="p-[11px_18px] text-[11px] font-bold text-[var(--text3)] text-left uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!isLoading ? reviews.map((rev) => (
                                    <tr key={rev.id} className="border-b border-[#0000000a] last:border-0 hover:bg-[var(--bg)] transition-colors">
                                        <td className="p-[13px_18px] text-[12px] text-[var(--text)] font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                        <td className="p-[13px_18px] text-[13px] font-bold text-[var(--accent)]">{rev.rating.toFixed(1)}</td>
                                        <td className="p-[13px_18px]">
                                            <span className="text-[11px] font-bold text-[var(--text2)]">{rev.status}</span>
                                        </td>
                                        <td className="p-[13px_18px] text-[12px] text-[var(--text3)] max-w-[200px] truncate">{rev.comments}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-10 text-center text-[var(--text3)]">Loading...</td></tr>
                                )}
                            </tbody>
                        </table>
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
                                        <div className="font-semibold text-[13px] text-[var(--text)]">{g.goal}</div>
                                        <div className="text-[11px] font-semibold text-[var(--text3)] uppercase">{g.status}</div>
                                    </div>
                                    <div className="w-full h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                        <div className={cn("h-full rounded-[3px]", "bg-gradient-to-r", g.color)} style={{ width: `${g.progress}%` }} />
                                    </div>
                                </div>
                                <div className="text-[12px] font-mono font-bold text-[var(--text)] w-[40px] text-right">{g.progress}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
