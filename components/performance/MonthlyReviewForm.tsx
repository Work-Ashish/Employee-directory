"use client"

import * as React from "react"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons"

interface Employee {
    id: string
    firstName: string
    lastName: string
    designation?: string
}

interface KPIRow {
    kpi: string
    target: string
    actual: string
    achievement: number
    trend: "up" | "down" | "same"
}

interface CompetencyRating {
    area: string
    rating: number
    comments: string
}

interface MonthlyFormData {
    kpiScorecard: KPIRow[]
    competencyRatings: CompetencyRating[]
    overallRating: number
    accomplishments: string
    areasForImprovement: string
    goalsForNextMonth: string[]
    trainingPlan: string
    managerComments: string
    employeeSelfAssessment: string
}

const DEFAULT_KPIS: KPIRow[] = [
    { kpi: "Projects/Tasks Completed", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Deadlines Met", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Quality Score", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Client/Stakeholder Satisfaction", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Revenue/Cost Impact", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Training Completed", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Attendance Rate", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Team Contribution", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Documentation Delivered", target: "", actual: "", achievement: 0, trend: "same" },
    { kpi: "Innovation Initiatives", target: "", actual: "", achievement: 0, trend: "same" },
]

const DEFAULT_COMPETENCIES: CompetencyRating[] = [
    { area: "Technical Proficiency", rating: 0, comments: "" },
    { area: "Communication & Collaboration", rating: 0, comments: "" },
    { area: "Leadership & Initiative", rating: 0, comments: "" },
    { area: "Problem Solving", rating: 0, comments: "" },
    { area: "Time Management", rating: 0, comments: "" },
    { area: "Customer Focus", rating: 0, comments: "" },
    { area: "Adaptability & Learning", rating: 0, comments: "" },
    { area: "Quality & Detail", rating: 0, comments: "" },
    { area: "Process Compliance", rating: 0, comments: "" },
    { area: "Continuous Improvement", rating: 0, comments: "" },
]

const OVERALL_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: "Needs Improvement", color: "text-danger" },
    2: { label: "Below Expectations", color: "text-warning" },
    3: { label: "Meets Expectations", color: "text-text" },
    4: { label: "Exceeds Expectations", color: "text-accent" },
    5: { label: "Outstanding", color: "text-success" },
}

const TREND_ICONS: Record<string, string> = { up: "↑", down: "↓", same: "→" }

interface MonthlyReviewFormProps {
    employees: Employee[]
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    defaultKpis?: string[]
    defaultCompetencies?: string[]
}

export function MonthlyReviewForm({ employees, onSubmit, onCancel, defaultKpis, defaultCompetencies }: MonthlyReviewFormProps) {
    const [employeeId, setEmployeeId] = React.useState("")
    const [reviewMonth, setReviewMonth] = React.useState(format(new Date(), "yyyy-MM"))
    const [reviewDate, setReviewDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
    const [kpis, setKpis] = React.useState<KPIRow[]>(() =>
        defaultKpis
            ? defaultKpis.map(kpi => ({ kpi, target: "", actual: "", achievement: 0, trend: "same" as const }))
            : [...DEFAULT_KPIS]
    )
    const [competencies, setCompetencies] = React.useState<CompetencyRating[]>(() =>
        defaultCompetencies
            ? defaultCompetencies.map(area => ({ area, rating: 0, comments: "" }))
            : [...DEFAULT_COMPETENCIES]
    )
    const [overallRating, setOverallRating] = React.useState(0)
    const [accomplishments, setAccomplishments] = React.useState("")
    const [areasForImprovement, setAreasForImprovement] = React.useState("")
    const [goalsForNextMonth, setGoalsForNextMonth] = React.useState(["", "", ""])
    const [trainingPlan, setTrainingPlan] = React.useState("")
    const [managerComments, setManagerComments] = React.useState("")
    const [submitting, setSubmitting] = React.useState(false)

    const selectedEmployee = employees.find(e => e.id === employeeId)

    const updateKPI = (index: number, field: keyof KPIRow, value: string) => {
        setKpis(prev => prev.map((k, i) => {
            if (i !== index) return k
            const updated = { ...k, [field]: value }
            // Auto-calculate achievement
            if (field === "target" || field === "actual") {
                const target = parseFloat(field === "target" ? value : k.target)
                const actual = parseFloat(field === "actual" ? value : k.actual)
                updated.achievement = target > 0 && !isNaN(actual) ? Math.round((actual / target) * 100) : 0
            }
            return updated
        }))
    }

    const updateKPITrend = (index: number, trend: "up" | "down" | "same") => {
        setKpis(prev => prev.map((k, i) => i === index ? { ...k, trend } : k))
    }

    const addKPIRow = () => {
        setKpis(prev => [...prev, { kpi: "", target: "", actual: "", achievement: 0, trend: "same" as const }])
    }

    const removeKPIRow = (index: number) => {
        setKpis(prev => prev.filter((_, i) => i !== index))
    }

    const updateCompetencyRating = (index: number, rating: number) => {
        setCompetencies(prev => prev.map((c, i) => i === index ? { ...c, rating } : c))
    }

    const updateCompetencyComment = (index: number, comments: string) => {
        setCompetencies(prev => prev.map((c, i) => i === index ? { ...c, comments } : c))
    }

    const competencyAvg = React.useMemo(() => {
        const rated = competencies.filter(c => c.rating > 0)
        if (rated.length === 0) return 0
        return rated.reduce((sum, c) => sum + c.rating, 0) / rated.length
    }, [competencies])

    const handleSubmit = async () => {
        if (!employeeId) { toast.error("Please select an employee"); return }
        if (overallRating === 0) { toast.error("Please select an overall rating"); return }
        const unrated = competencies.filter(c => c.rating === 0)
        if (unrated.length > 0) { toast.error(`Please rate all competencies (${unrated.length} unrated)`); return }

        setSubmitting(true)
        try {
            const [year, month] = reviewMonth.split("-")
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long" })
            const periodLabel = `${monthName} ${year}`

            const formData: MonthlyFormData = {
                kpiScorecard: kpis.filter(k => k.kpi.trim()),
                competencyRatings: competencies,
                overallRating,
                accomplishments,
                areasForImprovement,
                goalsForNextMonth: goalsForNextMonth.filter(g => g.trim()),
                trainingPlan,
                managerComments,
                employeeSelfAssessment: "",
            }

            await onSubmit({
                employeeId,
                rating: overallRating,
                progress: Math.round((overallRating / 5) * 100),
                comments: managerComments || "Monthly performance review",
                reviewDate: new Date(reviewDate),
                status: overallRating >= 4 ? "EXCELLENT" : overallRating >= 3 ? "GOOD" : "NEEDS_IMPROVEMENT",
                reviewType: "MANAGER",
                reviewPeriod: periodLabel,
                formType: "MONTHLY",
                formData,
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Section 1: Employee Info */}
            <div className="bg-gradient-to-r from-purple/5 to-accent/5 border border-purple/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select
                        label="Employee *"
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                    >
                        <option value="">Select Employee...</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                        ))}
                    </Select>
                    <Input
                        label="Designation"
                        value={selectedEmployee?.designation || "—"}
                        disabled
                    />
                    <Input
                        label="Review Month"
                        type="month"
                        value={reviewMonth}
                        onChange={e => setReviewMonth(e.target.value)}
                    />
                    <Input
                        label="Review Date"
                        type="date"
                        value={reviewDate}
                        onChange={e => setReviewDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Section 2: KPI Scorecard */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider">Monthly KPI Scorecard</h3>
                    <Button variant="ghost" size="sm" onClick={addKPIRow} leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>
                        Add Row
                    </Button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[25%]">KPI / Metric</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[14%]">Monthly Target</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[14%]">Actual</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[14%]">% Achievement</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[12%]">Trend</th>
                                    <th className="px-2 py-2.5 w-[5%]" />
                                </tr>
                            </thead>
                            <tbody>
                                {kpis.map((k, i) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                                        <td className="px-3 py-2">
                                            <input
                                                className="input-base text-sm py-1.5"
                                                value={k.kpi}
                                                onChange={e => updateKPI(i, "kpi", e.target.value)}
                                                placeholder="KPI name"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                className="input-base text-sm py-1.5 text-center"
                                                value={k.target}
                                                onChange={e => updateKPI(i, "target", e.target.value)}
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                className="input-base text-sm py-1.5 text-center"
                                                value={k.actual}
                                                onChange={e => updateKPI(i, "actual", e.target.value)}
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={cn(
                                                "text-sm font-bold",
                                                k.achievement >= 100 ? "text-success" :
                                                    k.achievement >= 75 ? "text-accent" :
                                                        k.achievement > 0 ? "text-warning" : "text-text-4"
                                            )}>
                                                {k.achievement > 0 ? `${k.achievement}%` : "—"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center gap-1">
                                                {(["up", "down", "same"] as const).map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => updateKPITrend(i, t)}
                                                        className={cn(
                                                            "w-7 h-7 rounded text-sm font-bold transition-all",
                                                            k.trend === t
                                                                ? t === "up" ? "bg-success/15 text-success" :
                                                                    t === "down" ? "bg-danger/15 text-danger" :
                                                                        "bg-text-4/15 text-text-3"
                                                                : "text-text-4 hover:bg-bg-2"
                                                        )}
                                                    >
                                                        {TREND_ICONS[t]}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeKPIRow(i)}
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
            </div>

            {/* Section 3: Competency Ratings */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider">Competency & Performance Ratings</h3>
                    {competencyAvg > 0 && (
                        <Badge variant={competencyAvg >= 4 ? "success" : competencyAvg >= 3 ? "default" : "warning"}>
                            Avg: {competencyAvg.toFixed(1)} / 5.0
                        </Badge>
                    )}
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-surface-2 border-b border-border">
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[30%]">Competency Area</th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider" colSpan={5}>
                                    <div className="flex justify-between px-2">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <span key={n} className="w-12 text-center">{n}</span>
                                        ))}
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[25%]">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {competencies.map((c, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-text">{c.area}</span>
                                    </td>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <td key={n} className="py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => updateCompetencyRating(i, n)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-all duration-200 text-xs font-bold",
                                                    c.rating === n
                                                        ? "border-purple bg-purple text-white scale-110"
                                                        : "border-border hover:border-purple/50 text-text-3 hover:text-purple"
                                                )}
                                            >
                                                {n}
                                            </button>
                                        </td>
                                    ))}
                                    <td className="px-3 py-3">
                                        <input
                                            className="input-base text-sm py-1.5"
                                            value={c.comments}
                                            onChange={e => updateCompetencyComment(i, e.target.value)}
                                            placeholder="Optional..."
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="bg-surface-2 px-4 py-2.5 border-t border-border flex justify-between text-xs text-text-3">
                        <span>1 = Needs Improvement</span>
                        <span>2 = Below Expectations</span>
                        <span>3 = Meets Expectations</span>
                        <span>4 = Exceeds Expectations</span>
                        <span>5 = Outstanding</span>
                    </div>
                </div>
            </div>

            {/* Section 4: Overall Performance Rating */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Overall Performance Rating</h3>
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-center gap-4">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setOverallRating(n)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]",
                                    overallRating === n
                                        ? "border-accent bg-accent/5 scale-105 shadow-md"
                                        : "border-border hover:border-accent/30"
                                )}
                            >
                                <span className={cn(
                                    "text-2xl font-extrabold",
                                    overallRating === n ? "text-accent" : "text-text-3"
                                )}>
                                    {n}
                                </span>
                                <span className={cn(
                                    "text-xs font-medium text-center",
                                    overallRating === n ? OVERALL_LABELS[n].color : "text-text-4"
                                )}>
                                    {OVERALL_LABELS[n].label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section 5: Goals & Development */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Goals & Development</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Textarea
                        label="Key Accomplishments"
                        value={accomplishments}
                        onChange={e => setAccomplishments(e.target.value)}
                        placeholder="List the key accomplishments this month..."
                        rows={4}
                    />
                    <Textarea
                        label="Areas for Improvement"
                        value={areasForImprovement}
                        onChange={e => setAreasForImprovement(e.target.value)}
                        placeholder="Areas that need improvement..."
                        rows={4}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-text-2">Goals for Next Month</label>
                        {goalsForNextMonth.map((g, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple w-5 shrink-0">{i + 1}.</span>
                                <input
                                    className="input-base text-sm"
                                    value={g}
                                    onChange={e => {
                                        const next = [...goalsForNextMonth]
                                        next[i] = e.target.value
                                        setGoalsForNextMonth(next)
                                    }}
                                    placeholder={`Goal ${i + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                    <Textarea
                        label="Training / Development Plan"
                        value={trainingPlan}
                        onChange={e => setTrainingPlan(e.target.value)}
                        placeholder="Recommended training or development activities..."
                        rows={4}
                    />
                </div>
            </div>

            {/* Section 6: Feedback & Comments */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Feedback & Comments</h3>
                <Textarea
                    label="Manager's Overall Comments"
                    value={managerComments}
                    onChange={e => setManagerComments(e.target.value)}
                    placeholder="Provide comprehensive feedback on the employee's performance this month..."
                    rows={4}
                />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                    {overallRating > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-3">Overall:</span>
                            <span className={cn("text-lg font-extrabold", OVERALL_LABELS[overallRating]?.color)}>
                                {overallRating} / 5
                            </span>
                            <Badge variant={overallRating >= 4 ? "success" : overallRating >= 3 ? "default" : "warning"} size="sm">
                                {OVERALL_LABELS[overallRating]?.label}
                            </Badge>
                        </div>
                    )}
                    {competencyAvg > 0 && (
                        <span className="text-xs text-text-4">Competency Avg: {competencyAvg.toFixed(1)}</span>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={submitting}>Submit Monthly Review</Button>
                </div>
            </div>
        </div>
    )
}
