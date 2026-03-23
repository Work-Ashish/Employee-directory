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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
    id: string
    firstName: string
    lastName: string
    designation?: string
    department?: { name: string }
    employeeCode?: string
    reportingTo?: { id: string; firstName: string; lastName: string } | null
}

interface RecruiterMetric {
    serialNo: number
    metric: string
    target: number | ""
    achieved: number | ""
    conversionPct: number | null
}

interface TeamLeadMetric {
    serialNo: number
    metric: string
    details: string
}

interface MonthlyReviewFormProps {
    employees: Employee[]
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    isHR?: boolean
    isTeamLead?: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RECRUITER_METRICS: string[] = [
    "No. of Demands Worked On",
    "No. of CVs Sourced / Screened",
    "No. of CVs Submitted to Client",
    "No. of Interviews Scheduled",
    "No. of Interviews Cleared (All Rounds)",
    "No. of Offers Made",
    "No. of Offers Accepted",
    "No. of Candidates Onboarded",
    "Time to Fill (Avg. Days per Position)",
    "Client Satisfaction Score (if applicable)",
]

const TEAM_LEAD_METRICS: string[] = [
    "No. of Recruiters Managed",
    "No. of Active Client Accounts Handled",
    "Total Demands Assigned to Team",
    "Total Team Submissions",
    "Total Team Interviews",
    "Total Team Offers",
    "Total Team Onboards",
    "Escalations Handled / Resolved",
]

const RATING_SCALE = [
    { rating: 5, category: "Outstanding", range: "90-100%", desc: "Exceptional performance; exceeds all targets consistently" },
    { rating: 4, category: "Excellent", range: "75-89%", desc: "Strong performance; exceeds most targets" },
    { rating: 3, category: "Good", range: "60-74%", desc: "Meets expectations; delivers on assigned targets" },
    { rating: 2, category: "Needs Improvement", range: "40-59%", desc: "Below expectations; requires coaching and support" },
    { rating: 1, category: "Unsatisfactory", range: "Below 40%", desc: "Significantly below targets; performance alert issued" },
]

const RATING_LABELS: Record<number, { label: string; color: string }> = {
    5: { label: "Outstanding", color: "text-success" },
    4: { label: "Excellent", color: "text-accent" },
    3: { label: "Good", color: "text-text" },
    2: { label: "Needs Improvement", color: "text-warning" },
    1: { label: "Unsatisfactory", color: "text-danger" },
}

const ALERT_OPTIONS = [
    { value: "", label: "Select..." },
    { value: "appreciation", label: "Appreciation (Rating 4-5)" },
    { value: "satisfactory", label: "Satisfactory (Rating 3)" },
    { value: "performance_alert", label: "Performance Alert (Rating 1-2)" },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function calcConversion(target: number | "", achieved: number | ""): number | null {
    const t = typeof target === "number" ? target : 0
    const a = typeof achieved === "number" ? achieved : 0
    if (t <= 0) return null
    return Math.round((a / t) * 100 * 10) / 10
}

function conversionColor(pct: number | null): string {
    if (pct === null) return "text-text-4"
    if (pct >= 90) return "text-success"
    if (pct >= 75) return "text-accent"
    if (pct >= 60) return "text-warning"
    return "text-danger"
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MonthlyReviewForm({ employees, onSubmit, onCancel, isHR = false, isTeamLead = false }: MonthlyReviewFormProps) {
    // --- state ---
    const [employeeId, setEmployeeId] = React.useState("")
    const [reviewMonth, setReviewMonth] = React.useState(format(new Date(), "yyyy-MM"))
    const [recruiterMetrics, setRecruiterMetrics] = React.useState<RecruiterMetric[]>(
        () => RECRUITER_METRICS.map((m, i) => ({ serialNo: i + 1, metric: m, target: "", achieved: "", conversionPct: null }))
    )
    const [teamLeadMetrics, setTeamLeadMetrics] = React.useState<TeamLeadMetric[]>(
        () => TEAM_LEAD_METRICS.map((m, i) => ({ serialNo: i + 1, metric: m, details: "" }))
    )
    const [hrRating, setHrRating] = React.useState(0)
    const [reviewerRemarks, setReviewerRemarks] = React.useState("")
    const [strengthsObserved, setStrengthsObserved] = React.useState("")
    const [areasForImprovement, setAreasForImprovement] = React.useState("")
    const [actionItems, setActionItems] = React.useState("")
    const [appreciationOrAlert, setAppreciationOrAlert] = React.useState("")
    const [submitting, setSubmitting] = React.useState(false)

    const selectedEmployee = employees.find(e => e.id === employeeId)

    // --- derived ---
    const avgConversion = React.useMemo(() => {
        const valid = recruiterMetrics.map(m => calcConversion(m.target, m.achieved)).filter((v): v is number => v !== null)
        if (valid.length === 0) return null
        return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length * 10) / 10
    }, [recruiterMetrics])

    const scorePercentage = avgConversion ?? 0

    // --- handlers ---
    const updateRecruiterMetric = (index: number, field: "target" | "achieved", raw: string) => {
        setRecruiterMetrics(prev => prev.map((m, i) => {
            if (i !== index) return m
            const num = raw === "" ? ("" as const) : Number(raw)
            const updated = { ...m, [field]: num }
            updated.conversionPct = calcConversion(updated.target, updated.achieved)
            return updated
        }))
    }

    const handleSubmit = async () => {
        if (!employeeId) { toast.error("Please select an employee"); return }
        if (!reviewMonth) { toast.error("Please select a review month"); return }

        setSubmitting(true)
        try {
            const [year, month] = reviewMonth.split("-").map(Number)
            await onSubmit({
                employeeId,
                reviewMonth: month,
                reviewYear: year,
                recruiterMetrics: recruiterMetrics.map(m => ({
                    serialNo: m.serialNo,
                    metric: m.metric,
                    target: typeof m.target === "number" ? m.target : 0,
                    achieved: typeof m.achieved === "number" ? m.achieved : 0,
                    conversionPct: m.conversionPct ?? 0,
                })),
                teamLeadMetrics: isTeamLead
                    ? teamLeadMetrics.map(m => ({ serialNo: m.serialNo, metric: m.metric, details: m.details }))
                    : [],
                rating: hrRating || null,
                ratingCategory: hrRating ? (RATING_LABELS[hrRating]?.label ?? "") : "",
                scorePercentage,
                reviewerRemarks,
                strengthsObserved,
                areasForImprovement,
                actionItems,
                appreciationOrAlert,
                reportingManagerId: selectedEmployee?.reportingTo?.id ?? null,
            })
        } finally {
            setSubmitting(false)
        }
    }

    // --- render ---
    return (
        <div className="space-y-8">
            {/* ============ SECTION A — EMPLOYEE INFORMATION ============ */}
            <div className="bg-gradient-to-r from-purple/5 to-accent/5 border border-purple/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Section A: Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select label="Employee Name *" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                        <option value="">Select Employee...</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                        ))}
                    </Select>
                    <Input label="Employee ID" value={selectedEmployee?.employeeCode || "---"} disabled />
                    <Input label="Designation" value={selectedEmployee?.designation || "---"} disabled />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Input label="Department" value={selectedEmployee?.department?.name || "---"} disabled />
                    <Input
                        label="Reporting Manager"
                        value={selectedEmployee?.reportingTo ? `${selectedEmployee.reportingTo.firstName} ${selectedEmployee.reportingTo.lastName}` : "---"}
                        disabled
                    />
                    <Input label="Review Month / Year" type="month" value={reviewMonth} onChange={e => setReviewMonth(e.target.value)} />
                </div>
            </div>

            {/* ============ SECTION B — PERFORMANCE METRICS (RECRUITER) ============ */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-2">Section B: Performance Metrics (Recruiter)</h3>
                <p className="text-xs text-text-4 mb-4">
                    Fill in your Target (as set by your manager) and Achieved numbers for the review month. Conversion % will be calculated by HR.
                </p>
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[6%]">S.No.</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[38%]">Performance Metric</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[18%]">Target</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[18%]">Achieved</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[20%]">Conversion %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recruiterMetrics.map((m, i) => (
                                    <tr key={i} className={cn("border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors", i % 2 === 1 && "bg-bg/30")}>
                                        <td className="px-3 py-2 text-center text-xs font-bold text-text-3">{m.serialNo}</td>
                                        <td className="px-4 py-2 text-sm text-text">{m.metric}</td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                className="input-base text-sm py-1.5 text-center"
                                                value={m.target}
                                                onChange={e => updateRecruiterMetric(i, "target", e.target.value)}
                                                placeholder="---"
                                                min={0}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                className="input-base text-sm py-1.5 text-center"
                                                value={m.achieved}
                                                onChange={e => updateRecruiterMetric(i, "achieved", e.target.value)}
                                                placeholder="---"
                                                min={0}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={cn("text-sm font-bold", conversionColor(m.conversionPct))}>
                                                {m.conversionPct !== null ? `${m.conversionPct}%` : "---"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ============ SECTION C — TEAM LEAD METRICS (conditional) ============ */}
            {isTeamLead && (
                <div>
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-2">Section C: Team Lead Metrics (For Leads Only)</h3>
                    <p className="text-xs text-text-4 mb-4">
                        Team Leads must complete this section in addition to Section B. Provide aggregate team data.
                    </p>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[6%]">S.No.</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[50%]">Team Management Metric</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[44%]">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamLeadMetrics.map((m, i) => (
                                    <tr key={i} className={cn("border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors", i % 2 === 1 && "bg-bg/30")}>
                                        <td className="px-3 py-2 text-center text-xs font-bold text-text-3">{m.serialNo}</td>
                                        <td className="px-4 py-2 text-sm text-text">{m.metric}</td>
                                        <td className="px-3 py-2">
                                            <input
                                                className="input-base text-sm py-1.5"
                                                value={m.details}
                                                onChange={e => {
                                                    setTeamLeadMetrics(prev => prev.map((tm, j) => j === i ? { ...tm, details: e.target.value } : tm))
                                                }}
                                                placeholder="Enter details..."
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============ SECTION D — RATING SCALE (HR USE ONLY) ============ */}
            {isHR && (
                <div>
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Section D: Rating Scale (HR Use Only)</h3>
                    <div className="border border-border rounded-xl overflow-hidden mb-6">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[10%]">Rating</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[20%]">Category</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[15%]">Score Range</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[55%]">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RATING_SCALE.map((r, i) => (
                                    <tr key={r.rating} className={cn("border-b border-border/50 last:border-0", i % 2 === 1 && "bg-bg/30")}>
                                        <td className="px-4 py-2.5 text-center text-sm font-bold text-text">{r.rating}</td>
                                        <td className={cn("px-4 py-2.5 text-sm font-semibold", RATING_LABELS[r.rating]?.color)}>{r.category}</td>
                                        <td className="px-4 py-2.5 text-center text-sm text-text-3">{r.range}</td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{r.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Rating selector */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <p className="text-sm font-medium text-text-2 mb-4 text-center">Select Overall Rating</p>
                        <div className="flex items-center justify-center gap-4">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setHrRating(n)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]",
                                        hrRating === n
                                            ? "border-accent bg-accent/5 scale-105 shadow-md"
                                            : "border-border hover:border-accent/30"
                                    )}
                                >
                                    <span className={cn("text-2xl font-extrabold", hrRating === n ? "text-accent" : "text-text-3")}>{n}</span>
                                    <span className={cn("text-xs font-medium text-center", hrRating === n ? RATING_LABELS[n]?.color : "text-text-4")}>
                                        {RATING_LABELS[n]?.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SECTION E — REVIEWER REMARKS (HR USE ONLY) ============ */}
            {isHR && (
                <div>
                    <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Section E: Reviewer Remarks (HR Use Only)</h3>
                    <div className="space-y-4">
                        <Input
                            label="Overall Rating (1-5)"
                            value={hrRating ? `${hrRating} - ${RATING_LABELS[hrRating]?.label}` : "Not set"}
                            disabled
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Textarea
                                label="HR Reviewer Remarks"
                                value={reviewerRemarks}
                                onChange={e => setReviewerRemarks(e.target.value)}
                                placeholder="Overall remarks on the employee's monthly performance..."
                                rows={3}
                            />
                            <Textarea
                                label="Strengths Observed"
                                value={strengthsObserved}
                                onChange={e => setStrengthsObserved(e.target.value)}
                                placeholder="Key strengths demonstrated this month..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Textarea
                                label="Areas for Improvement"
                                value={areasForImprovement}
                                onChange={e => setAreasForImprovement(e.target.value)}
                                placeholder="Areas that need development..."
                                rows={3}
                            />
                            <Textarea
                                label="Action Items / Next Steps"
                                value={actionItems}
                                onChange={e => setActionItems(e.target.value)}
                                placeholder="Specific action items for the next review period..."
                                rows={3}
                            />
                        </div>
                        <Select
                            label="Appreciation / Performance Alert"
                            value={appreciationOrAlert}
                            onChange={e => setAppreciationOrAlert(e.target.value)}
                            options={ALERT_OPTIONS}
                        />
                    </div>
                </div>
            )}

            {/* ============ SECTION F — SIGNATURES & ACKNOWLEDGEMENT ============ */}
            <div>
                <h3 className="text-sm font-bold text-text-3 uppercase tracking-wider mb-4">Section F: Signatures & Acknowledgement</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: "Employee Signature", name: selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : "---" },
                        { label: "Reporting Manager", name: selectedEmployee?.reportingTo ? `${selectedEmployee.reportingTo.firstName} ${selectedEmployee.reportingTo.lastName}` : "---" },
                        { label: "HR Officer", name: isHR ? "Current User" : "---" },
                    ].map(sig => (
                        <div key={sig.label} className="border border-border rounded-xl p-4 flex flex-col items-center gap-3">
                            <span className="text-xs font-bold text-text-3 uppercase tracking-wider">{sig.label}</span>
                            <span className="text-sm text-text-2">{sig.name}</span>
                            <Badge variant="warning" size="sm">Pending</Badge>
                            <Button variant="secondary" size="sm" disabled>Sign</Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============ FOOTER ============ */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4 flex-wrap">
                    {avgConversion !== null && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-3">Avg Conversion:</span>
                            <span className={cn("text-lg font-extrabold", conversionColor(avgConversion))}>{avgConversion}%</span>
                        </div>
                    )}
                    {hrRating > 0 && (
                        <Badge variant={hrRating >= 4 ? "success" : hrRating >= 3 ? "default" : "warning"} size="sm">
                            Rating: {hrRating} - {RATING_LABELS[hrRating]?.label}
                        </Badge>
                    )}
                    {scorePercentage > 0 && (
                        <span className="text-xs text-text-4">Score: {scorePercentage}%</span>
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
