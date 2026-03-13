"use client"

import * as React from "react"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons"

interface ActivityMetric {
    metric: string
    target: string
    actual: string
    notes: string
}

interface BehavioralRating {
    competency: string
    rating: number
    comments: string
}

interface DailySelfFormData {
    activityMetrics: ActivityMetric[]
    behavioralRatings: BehavioralRating[]
    priorities: string[]
    blockers: string
    keyWins: string
    actionItems: string
}

const DEFAULT_ACTIVITY_METRICS: ActivityMetric[] = [
    { metric: "Tasks Completed", target: "", actual: "", notes: "" },
    { metric: "Meetings Attended", target: "", actual: "", notes: "" },
    { metric: "Emails/Communications", target: "", actual: "", notes: "" },
    { metric: "Reports Prepared", target: "", actual: "", notes: "" },
    { metric: "Client Interactions", target: "", actual: "", notes: "" },
    { metric: "Issues Resolved", target: "", actual: "", notes: "" },
    { metric: "Training Hours", target: "", actual: "", notes: "" },
    { metric: "Collaboration Activities", target: "", actual: "", notes: "" },
]

const DEFAULT_BEHAVIORAL_COMPETENCIES: BehavioralRating[] = [
    { competency: "Communication Quality", rating: 0, comments: "" },
    { competency: "Responsiveness & Follow-Through", rating: 0, comments: "" },
    { competency: "Team Collaboration", rating: 0, comments: "" },
    { competency: "Attention to Detail", rating: 0, comments: "" },
    { competency: "Problem Solving", rating: 0, comments: "" },
    { competency: "Process Adherence", rating: 0, comments: "" },
]

const RATING_LABELS = ["", "Poor", "Below Avg", "Average", "Good", "Excellent"]

interface DailySelfReviewFormProps {
    employeeId: string
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    defaultActivityMetrics?: string[]
    defaultBehavioralItems?: string[]
}

export function DailySelfReviewForm({ employeeId, onSubmit, onCancel, defaultActivityMetrics, defaultBehavioralItems }: DailySelfReviewFormProps) {
    const [reviewDate, setReviewDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
    const [activityMetrics, setActivityMetrics] = React.useState<ActivityMetric[]>(() =>
        defaultActivityMetrics
            ? defaultActivityMetrics.map(metric => ({ metric, target: "", actual: "", notes: "" }))
            : [...DEFAULT_ACTIVITY_METRICS]
    )
    const [behavioralRatings, setBehavioralRatings] = React.useState<BehavioralRating[]>(() =>
        defaultBehavioralItems
            ? defaultBehavioralItems.map(competency => ({ competency, rating: 0, comments: "" }))
            : [...DEFAULT_BEHAVIORAL_COMPETENCIES]
    )
    const [priorities, setPriorities] = React.useState(["", "", ""])
    const [blockers, setBlockers] = React.useState("")
    const [keyWins, setKeyWins] = React.useState("")
    const [actionItems, setActionItems] = React.useState("")
    const [submitting, setSubmitting] = React.useState(false)

    const updateMetric = (index: number, field: keyof ActivityMetric, value: string) => {
        setActivityMetrics(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
    }

    const addMetricRow = () => {
        setActivityMetrics(prev => [...prev, { metric: "", target: "", actual: "", notes: "" }])
    }

    const removeMetricRow = (index: number) => {
        setActivityMetrics(prev => prev.filter((_, i) => i !== index))
    }

    const updateRating = (index: number, rating: number) => {
        setBehavioralRatings(prev => prev.map((r, i) => i === index ? { ...r, rating } : r))
    }

    const updateRatingComment = (index: number, comments: string) => {
        setBehavioralRatings(prev => prev.map((r, i) => i === index ? { ...r, comments } : r))
    }

    const avgRating = React.useMemo(() => {
        const rated = behavioralRatings.filter(r => r.rating > 0)
        if (rated.length === 0) return 0
        return rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
    }, [behavioralRatings])

    const handleSubmit = async () => {
        const unrated = behavioralRatings.filter(r => r.rating === 0)
        if (unrated.length > 0) {
            toast.error(`Please rate all competencies (${unrated.length} unrated)`)
            return
        }

        setSubmitting(true)
        try {
            const formData: DailySelfFormData = {
                activityMetrics: activityMetrics.filter(m => m.metric.trim()),
                behavioralRatings,
                priorities: priorities.filter(p => p.trim()),
                blockers,
                keyWins,
                actionItems,
            }

            await onSubmit({
                employeeId,
                rating: Math.round(avgRating * 10) / 10,
                progress: Math.round((avgRating / 5) * 100),
                comments: keyWins || "Daily self-review",
                reviewDate: new Date(reviewDate),
                status: avgRating >= 4 ? "EXCELLENT" : avgRating >= 3 ? "GOOD" : "NEEDS_IMPROVEMENT",
                reviewType: "SELF",
                reviewPeriod: format(new Date(reviewDate), "MMM d, yyyy"),
                formType: "DAILY",
                formData,
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Section 1: Review Date */}
            <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Daily Self-Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Review Date"
                        type="date"
                        value={reviewDate}
                        onChange={e => setReviewDate(e.target.value)}
                    />
                    <div className="flex items-end">
                        <p className="text-sm text-text-3">Reflect on your performance for the day and rate yourself honestly.</p>
                    </div>
                </div>
            </div>

            {/* Section 2: Activity Metrics Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider">My Daily Activity Metrics</h3>
                    <Button variant="ghost" size="sm" onClick={addMetricRow} leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>
                        Add Row
                    </Button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-surface-2 border-b border-border">
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[25%]">Activity / Metric</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[15%]">Target</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[15%]">Actual</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[35%]">Notes</th>
                                <th className="px-2 py-2.5 w-[10%]" />
                            </tr>
                        </thead>
                        <tbody>
                            {activityMetrics.map((m, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                                    <td className="px-3 py-2">
                                        <input
                                            className="input-base text-sm py-1.5"
                                            value={m.metric}
                                            onChange={e => updateMetric(i, "metric", e.target.value)}
                                            placeholder="Metric name"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            className="input-base text-sm py-1.5 text-center"
                                            value={m.target}
                                            onChange={e => updateMetric(i, "target", e.target.value)}
                                            placeholder="—"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            className="input-base text-sm py-1.5 text-center"
                                            value={m.actual}
                                            onChange={e => updateMetric(i, "actual", e.target.value)}
                                            placeholder="—"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            className="input-base text-sm py-1.5"
                                            value={m.notes}
                                            onChange={e => updateMetric(i, "notes", e.target.value)}
                                            placeholder="Additional notes..."
                                        />
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeMetricRow(i)}
                                            className="p-1 text-text-4 hover:text-danger transition-colors rounded"
                                        >
                                            <Cross2Icon className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 3: Behavioral Self-Ratings */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider">Self-Assessment: Quality & Behavior</h3>
                    {avgRating > 0 && (
                        <Badge variant={avgRating >= 4 ? "success" : avgRating >= 3 ? "default" : "warning"}>
                            Avg: {avgRating.toFixed(1)} / 5.0
                        </Badge>
                    )}
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-surface-2 border-b border-border">
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[30%]">Competency</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider" colSpan={5}>
                                    <div className="flex justify-between px-2">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <span key={n} className="w-12 text-center">{n}</span>
                                        ))}
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[25%]">Self-Reflection</th>
                            </tr>
                        </thead>
                        <tbody>
                            {behavioralRatings.map((r, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-text">{r.competency}</span>
                                    </td>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <td key={n} className="py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => updateRating(i, n)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-all duration-200 text-xs font-bold",
                                                    r.rating === n
                                                        ? "border-emerald-500 bg-emerald-500 text-white scale-110"
                                                        : "border-border hover:border-emerald-500/50 text-text-3 hover:text-emerald-500"
                                                )}
                                            >
                                                {n}
                                            </button>
                                        </td>
                                    ))}
                                    <td className="px-3 py-3">
                                        <input
                                            className="input-base text-sm py-1.5"
                                            value={r.comments}
                                            onChange={e => updateRatingComment(i, e.target.value)}
                                            placeholder="How did you do?"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="bg-surface-2 px-4 py-2.5 border-t border-border flex justify-between text-xs text-text-3">
                        <span>1 = Poor</span>
                        <span>2 = Below Average</span>
                        <span>3 = Average</span>
                        <span>4 = Good</span>
                        <span>5 = Excellent</span>
                    </div>
                </div>
            </div>

            {/* Section 4: Priorities & Blockers */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">My Priorities & Blockers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-text-2">Top 3 Priorities Today</label>
                        {priorities.map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-500 w-5 shrink-0">{i + 1}.</span>
                                <input
                                    className="input-base text-sm"
                                    value={p}
                                    onChange={e => {
                                        const next = [...priorities]
                                        next[i] = e.target.value
                                        setPriorities(next)
                                    }}
                                    placeholder={`Priority ${i + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                    <Textarea
                        label="Blockers / Challenges"
                        value={blockers}
                        onChange={e => setBlockers(e.target.value)}
                        placeholder="What challenges did you face today?"
                        rows={4}
                    />
                </div>
            </div>

            {/* Section 5: End-of-Day Reflection */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">End-of-Day Reflection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Textarea
                        label="Key Wins / Accomplishments"
                        value={keyWins}
                        onChange={e => setKeyWins(e.target.value)}
                        placeholder="What went well today? What are you proud of?"
                        rows={4}
                    />
                    <Textarea
                        label="Action Items for Tomorrow"
                        value={actionItems}
                        onChange={e => setActionItems(e.target.value)}
                        placeholder="What do you plan to focus on tomorrow?"
                        rows={4}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                    {avgRating > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-3">Self-Score:</span>
                            <span className={cn(
                                "text-lg font-extrabold",
                                avgRating >= 4 ? "text-success" : avgRating >= 3 ? "text-emerald-500" : "text-warning"
                            )}>
                                {avgRating.toFixed(1)}
                            </span>
                            <span className="text-sm text-text-3">/ 5.0</span>
                            <Badge variant={avgRating >= 4 ? "success" : avgRating >= 3 ? "default" : "warning"} size="sm">
                                {RATING_LABELS[Math.round(avgRating)] || ""}
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={submitting}>Submit Daily Self Review</Button>
                </div>
            </div>
        </div>
    )
}
