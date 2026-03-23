"use client"

import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import { ReviewDetailView } from "./ReviewDetailView"
import { DailySelfReviewForm } from "./DailySelfReviewForm"
import { toast } from "sonner"
import { format } from "date-fns"
import { PerformanceAPI } from "@/features/performance/api/client"
import type { MonthlyReviewData, AppraisalData } from "@/features/performance/api/client"
import { api } from "@/lib/api-client"

type PerformanceReview = {
    id: string
    rating: number
    progress: number
    comments: string | null
    reviewDate: string
    status: string
    formType: string | null
    formData: any
    reviewPeriod: string | null
    reviewType?: string | null
    employee: {
        id: string
        firstName: string
        lastName: string
        designation?: string
        department?: { name: string }
    }
    reviewer?: {
        id: string
        firstName: string
        lastName: string
    } | null
}

export function EmployeePerformanceView() {
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [viewReview, setViewReview] = React.useState<PerformanceReview | null>(null)
    const [dailySelfOpen, setDailySelfOpen] = React.useState(false)
    const [selfEmployeeId, setSelfEmployeeId] = React.useState<string | null>(null)
    const [activeTab, setActiveTab] = React.useState<"reviews" | "monthly" | "appraisals">("reviews")
    const [monthlyReviews, setMonthlyReviews] = React.useState<MonthlyReviewData[]>([])
    const [appraisalsList, setAppraisalsList] = React.useState<AppraisalData[]>([])
    const [sourceLoading, setSourceLoading] = React.useState(false)

    const fetchReviews = React.useCallback(async () => {
        try {
            const data = await PerformanceAPI.listReviews()
            setReviews(extractArray<PerformanceReview>(data.results || data))
        } catch (_error) {
            toast.error("Failed to load performance reviews")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => { fetchReviews() }, [fetchReviews])

    const resolveSelfEmployeeId = React.useCallback(async (): Promise<string | null> => {
        if (selfEmployeeId) return selfEmployeeId
        try {
            const { data } = await api.get<any>('/employees/profile/')
            const empId = data?.employeeId || data?.id
            if (empId) {
                setSelfEmployeeId(empId)
                return empId
            }
        } catch { /* non-critical */ }
        return null
    }, [selfEmployeeId])

    React.useEffect(() => { resolveSelfEmployeeId() }, [resolveSelfEmployeeId])

    const fetchSourceOne = React.useCallback(async () => {
        setSourceLoading(true)
        try {
            const [mr, ap] = await Promise.all([
                PerformanceAPI.listMonthlyReviews().catch(() => ({ results: [] })),
                PerformanceAPI.listAppraisals().catch(() => ({ results: [] })),
            ])
            setMonthlyReviews(extractArray(mr.results || mr))
            setAppraisalsList(extractArray(ap.results || ap))
        } finally {
            setSourceLoading(false)
        }
    }, [])

    React.useEffect(() => {
        if (activeTab !== "reviews") fetchSourceOne()
    }, [activeTab, fetchSourceOne])

    const handleOpenSelfReview = async () => {
        const empId = await resolveSelfEmployeeId()
        if (empId) {
            setDailySelfOpen(true)
        } else {
            toast.error("Could not find your employee profile. Please contact your admin.")
        }
    }

    const handleSubmitSelfReview = async (data: any) => {
        try {
            await PerformanceAPI.createReview(data)
            toast.success("Self-review submitted successfully")
            setDailySelfOpen(false)
            fetchReviews()
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit self-review")
        }
    }

    const managerReviews = reviews.filter(r => r.reviewType !== "SELF")
    const selfReviews = reviews.filter(r => r.reviewType === "SELF")

    const avgRating = managerReviews.length > 0
        ? (managerReviews.reduce((sum, r) => sum + r.rating, 0) / managerReviews.length).toFixed(1)
        : "0.0"

    const latest = managerReviews[0]

    return (
        <div className="space-y-6 animate-page-in">
            <div className="flex items-center justify-between">
                <PageHeader title="My Performance" description="Review your evaluations and submit self-reviews" />
                <Button size="sm" onClick={handleOpenSelfReview}>
                    Submit Self-Review
                </Button>
            </div>

            <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
                {(["reviews", "monthly", "appraisals"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); if (tab !== "reviews") fetchSourceOne() }}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                            activeTab === tab ? "bg-accent text-white shadow-sm" : "text-text-3 hover:text-text hover:bg-bg-2"
                        )}
                    >
                        {tab === "reviews" ? "My Reviews" : tab === "monthly" ? "Monthly Reviews" : "Appraisals"}
                    </button>
                ))}
            </div>

            {activeTab === "reviews" && (<>
            {/* Hero Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <Card className="p-8 bg-gradient-to-br from-accent to-purple text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Overall Rating</div>
                        <div className="flex items-end gap-3 mb-4">
                            <div className="text-[64px] font-extrabold leading-none">{avgRating}</div>
                            <div className="text-2xl font-bold mb-2">/ 5.0</div>
                        </div>
                        <div className="flex gap-1 mb-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn(i < Math.floor(Number(avgRating)) ? "text-white" : "text-white/30", "text-xl")}>★</span>
                            ))}
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
                            <span>{Number(avgRating) >= 4 ? "🎉" : Number(avgRating) >= 3 ? "👍" : "📈"}</span>
                            {latest?.status || "No reviews yet"}
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
                        <div className="text-2xl font-extrabold text-text">{managerReviews.length}</div>
                        <div className="text-sm text-text-3">Reviews Received</div>
                    </Card>
                </div>
            </div>

            {/* Manager Reviews */}
            <Card>
                <CardHeader className="border-b border-border">
                    <CardTitle>Manager Reviews</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2">
                                {["Date", "Type", "Rating", "Period", "Reviewer", "Status", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-10 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
                            ) : managerReviews.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-text-3">No reviews yet. Your manager will submit reviews here.</td></tr>
                            ) : managerReviews.map((rev) => (
                                <tr
                                    key={rev.id}
                                    className="border-b border-border/30 last:border-0 hover:bg-accent/[0.03] transition-colors cursor-pointer"
                                    onClick={() => setViewReview(rev)}
                                >
                                    <td className="px-4 py-3.5 text-sm text-text font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                    <td className="px-4 py-3.5">
                                        {rev.formType ? (
                                            <Badge variant={rev.formType === "DAILY" ? "default" : "neutral"} size="sm">
                                                {rev.formType}
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning" size="sm">Legacy</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-warning tracking-wider">{"★".repeat(Math.floor(rev.rating))}</span>
                                            <span className="text-text-4 tracking-wider">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                            <span className="text-sm text-text-3 ml-2 font-mono">{rev.rating.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-text-3">{rev.reviewPeriod || "—"}</td>
                                    <td className="px-4 py-3.5 text-sm text-text-3">
                                        {rev.reviewer ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}` : "—"}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Badge
                                            variant={rev.status === "EXCELLENT" ? "success" : rev.status === "GOOD" ? "default" : rev.status === "PENDING" ? "warning" : "neutral"}
                                            size="sm"
                                        >
                                            {rev.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Button variant="ghost" size="sm">View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* My Self-Reviews */}
            <Card>
                <CardHeader className="border-b border-border flex flex-row items-center justify-between">
                    <CardTitle>My Self-Reviews</CardTitle>
                    <Badge variant="neutral" size="sm">{selfReviews.length} submitted</Badge>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2">
                                {["Date", "Type", "Rating", "Period", "Status", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-10 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
                            ) : selfReviews.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-text-3">
                                    You haven&apos;t submitted any self-reviews yet. Click &quot;Submit Self-Review&quot; to get started.
                                </td></tr>
                            ) : selfReviews.map((rev) => (
                                <tr
                                    key={rev.id}
                                    className="border-b border-border/30 last:border-0 hover:bg-accent/[0.03] transition-colors cursor-pointer"
                                    onClick={() => setViewReview(rev)}
                                >
                                    <td className="px-4 py-3.5 text-sm text-text font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="default" size="sm">DAILY</Badge>
                                            <Badge variant="neutral" size="sm">Self</Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-warning tracking-wider">{"★".repeat(Math.floor(rev.rating))}</span>
                                            <span className="text-text-4 tracking-wider">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                            <span className="text-sm text-text-3 ml-2 font-mono">{rev.rating.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-text-3">{rev.reviewPeriod || "—"}</td>
                                    <td className="px-4 py-3.5">
                                        <Badge
                                            variant={rev.status === "EXCELLENT" ? "success" : rev.status === "GOOD" ? "default" : rev.status === "PENDING" ? "warning" : "neutral"}
                                            size="sm"
                                        >
                                            {rev.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Button variant="ghost" size="sm">View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Self-Review Form Dialog */}
            <Dialog open={dailySelfOpen} onClose={() => setDailySelfOpen(false)} size="full">
                <DialogHeader>
                    <DialogTitle>Submit Self-Review</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {selfEmployeeId && (
                        <DailySelfReviewForm
                            employeeId={selfEmployeeId}
                            onSubmit={handleSubmitSelfReview}
                            onCancel={() => setDailySelfOpen(false)}
                        />
                    )}
                </DialogBody>
            </Dialog>

            {/* View Review Detail */}
            <Dialog open={!!viewReview} onClose={() => setViewReview(null)} size="full">
                <DialogHeader>
                    <DialogTitle>
                        Review Details — {viewReview?.reviewType === "SELF" ? "Self" : viewReview?.formType || "Legacy"} Review
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {viewReview && <ReviewDetailView review={viewReview} />}
                </DialogBody>
            </Dialog>
            </>)}

            {activeTab === "monthly" && (
                <Card>
                    <CardHeader className="border-b border-border">
                        <CardTitle>My Monthly Reviews</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-surface-2">
                                    {["Month/Year", "Rating", "Score %", "Category", "Status", "Updated"].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sourceLoading ? (
                                    <tr><td colSpan={6} className="p-10 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
                                ) : monthlyReviews.length === 0 ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-text-3">No monthly reviews yet.</td></tr>
                                ) : monthlyReviews.map(mr => (
                                    <tr key={mr.id} className="border-b border-border/30 last:border-0 hover:bg-accent/[0.03] transition-colors">
                                        <td className="px-4 py-3.5 text-sm text-text font-mono">
                                            {["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mr.reviewMonth]} {mr.reviewYear}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {mr.rating ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-warning">{"★".repeat(mr.rating)}</span>
                                                    <span className="text-text-4">{"★".repeat(5 - mr.rating)}</span>
                                                    <span className="text-sm text-text-3 ml-1">{mr.rating}/5</span>
                                                </div>
                                            ) : <span className="text-text-4">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm font-mono">{mr.scorePercentage != null ? `${mr.scorePercentage}%` : "—"}</td>
                                        <td className="px-4 py-3.5">
                                            <Badge variant={mr.ratingCategory === "OUTSTANDING" ? "success" : mr.ratingCategory === "EXCELLENT" ? "default" : mr.ratingCategory === "GOOD" ? "neutral" : "warning"} size="sm">
                                                {mr.ratingCategoryDisplay || mr.ratingCategory || "—"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <Badge variant={mr.status === "ACKNOWLEDGED" ? "success" : mr.status === "REVIEWED" ? "default" : "neutral"} size="sm">
                                                {mr.statusDisplay || mr.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-text-3">{format(new Date(mr.updatedAt), "MMM d, yyyy")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === "appraisals" && (
                <Card>
                    <CardHeader className="border-b border-border">
                        <CardTitle>My Appraisals</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-surface-2">
                                    {["Type", "Period", "Financial Year", "Rating", "Status", "Updated"].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sourceLoading ? (
                                    <tr><td colSpan={6} className="p-10 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
                                ) : appraisalsList.length === 0 ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-text-3">No appraisals yet.</td></tr>
                                ) : appraisalsList.map(ap => (
                                    <tr key={ap.id} className="border-b border-border/30 last:border-0 hover:bg-accent/[0.03] transition-colors">
                                        <td className="px-4 py-3.5">
                                            <Badge variant={ap.reviewType === "ANNUAL" ? "purple" : "default"} size="sm">
                                                {ap.reviewTypeDisplay || ap.reviewType}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-text">{ap.reviewPeriod}</td>
                                        <td className="px-4 py-3.5 text-sm text-text-3">{ap.financialYear}</td>
                                        <td className="px-4 py-3.5">
                                            {ap.overallRating ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-warning">{"★".repeat(ap.overallRating)}</span>
                                                    <span className="text-text-4">{"★".repeat(5 - ap.overallRating)}</span>
                                                    <span className="text-sm text-text-3 ml-1">{ap.overallRating}/5</span>
                                                </div>
                                            ) : <span className="text-text-4">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <Badge variant={ap.status === "COMPLETED" ? "success" : ap.status === "HR_CALIBRATION" ? "info" : "neutral"} size="sm">
                                                {ap.statusDisplay || ap.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-text-3">{format(new Date(ap.updatedAt), "MMM d, yyyy")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
