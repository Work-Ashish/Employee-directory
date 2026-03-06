import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { PageHeader } from "@/components/ui/PageHeader"
import { toast } from "sonner"
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
    { goal: "Complete React Certification", deadline: "Mar 31, 2026", status: "In Progress", progress: 65, color: "from-info to-accent" },
    { goal: "Deliver Project X", deadline: "Apr 15, 2026", status: "On Track", progress: 40, color: "from-success to-success/70" },
    { goal: "Team Mentorship", deadline: "Continuous", status: "Active", progress: 100, color: "from-warning to-warning/70" },
]

export function EmployeePerformanceView() {
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await fetch("/api/performance")
                if (res.ok) {
                    setReviews(extractArray<PerformanceReview>(await res.json()))
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
        <div className="space-y-6 animate-page-in">
            <PageHeader title="My Performance" description="Review your goals and manager feedback" />

            {/* Hero + Rank Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                {/* Rating Card */}
                <Card className="p-8 bg-gradient-to-br from-accent to-purple text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Overall Rating</div>
                        <div className="flex items-end gap-3 mb-4">
                            <div className="text-[64px] font-extrabold leading-none">{avgRating}</div>
                            <div className="text-2xl font-bold mb-2">/ 5.0</div>
                        </div>
                        <div className="flex gap-1 mb-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn(i < Math.floor(Number(avgRating)) ? "text-white" : "text-white/30")}>★</span>
                            ))}
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
                            <span>{Number(avgRating) >= 4 ? "🎉" : Number(avgRating) >= 3 ? "👍" : "📈"}</span> {latest?.status || "No reviews yet"}
                        </div>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] text-[200px] opacity-10 rotate-12 select-none">⭐</div>
                </Card>

                <div className="flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col justify-center items-center text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-2xl mb-3">🏆</div>
                        <div className="text-2xl font-extrabold text-text">
                            {Number(avgRating) >= 4.5 ? "Top 5%" : Number(avgRating) >= 4.0 ? "Top 15%" : "Active"}
                        </div>
                        <div className="text-sm text-text-3">Performance Rank</div>
                    </Card>
                    <Card className="flex-1 flex flex-col justify-center items-center text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center text-2xl mb-3">💬</div>
                        <div className="text-2xl font-extrabold text-text">{reviews.length}</div>
                        <div className="text-sm text-text-3">Reviews Received</div>
                    </Card>
                </div>
            </div>

            {/* Table + OKRs */}
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
                <Card>
                    <CardHeader className="border-b border-border">
                        <CardTitle>Review History</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-surface-2">
                                    {["Date", "Rating", "Status", "Feedback"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!isLoading ? reviews.map((rev) => (
                                    <tr key={rev.id} className="border-b border-border/30 last:border-0 hover:bg-bg transition-colors">
                                        <td className="px-4 py-3.5 text-sm text-text font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                        <td className="px-4 py-3.5 text-base font-bold text-accent">{rev.rating.toFixed(1)}</td>
                                        <td className="px-4 py-3.5">
                                            <Badge variant={rev.status === "EXCELLENT" ? "success" : rev.status === "PENDING" ? "warning" : "neutral"} size="sm">
                                                {rev.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-text-3 max-w-[200px] truncate">{rev.comments}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-10 text-center text-text-3">Loading...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <CardHeader className="border-b border-border">
                        <CardTitle>My Objectives (OKRs)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {myGoals.map((g, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-semibold text-base text-text">{g.goal}</span>
                                        <Badge variant="neutral" size="sm">{g.status}</Badge>
                                    </div>
                                    <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full bg-gradient-to-r", g.color)} style={{ width: `${g.progress}%` }} />
                                    </div>
                                </div>
                                <span className="text-sm font-mono font-bold text-text w-10 text-right">{g.progress}%</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
