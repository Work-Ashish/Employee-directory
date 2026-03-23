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

interface Employee {
    id: string; firstName: string; lastName: string; designation?: string
    department?: { name: string }; employeeCode?: string; dateOfJoining?: string
    reportingTo?: { id: string; firstName: string; lastName: string } | null
}
interface AppraisalFormProps {
    employees: Employee[]; onSubmit: (data: any) => Promise<void>; onCancel: () => void
    reviewType: "ANNUAL" | "SIX_MONTHLY"; isHR?: boolean; isManager?: boolean
    isEmployee?: boolean; existingData?: any
}

const METRICS = ["No. of Demands Worked", "CVs Sourced / Screened", "CVs Submitted to Client", "Interviews Scheduled", "Interviews Cleared", "Offers Made", "Offers Accepted", "Candidates Onboarded", "Avg. Time to Fill (Days)"]
const SIX_MO = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
const ANNUAL_MO = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
const KPI_ROWS = ["CV-to-Interview Conversion Rate", "Interview-to-Offer Conversion Rate", "Offer-to-Onboard Conversion Rate", "Overall Demand Closure Rate", "Average Positions Closed per Month", "Client Retention / Repeat Demand %"]
const REC_COMP = ["Sourcing Skills & Channel Diversity", "Screening & Shortlisting Quality", "Client Requirement Understanding", "Candidate Relationship Management", "Timeliness & Follow-up Discipline", "ATS / Tools Proficiency", "Communication & Professionalism", "Adaptability & Learning Agility"]
const TL_COMP = ["Team Productivity & Output Management", "Client Account Management", "Demand Allocation & Prioritization", "Recruiter Coaching & Development", "Escalation Handling & Resolution", "Stakeholder Communication", "Strategic Planning & Process Improvement", "Data-Driven Decision Making", "Accountability & Ownership"]

type BV = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "purple"
const SCALE: { s: number; l: string; d: string; v: BV }[] = [
    { s: 1, l: "Needs Improvement", d: "Consistently below expectations; requires immediate action plan", v: "danger" },
    { s: 2, l: "Below Expectations", d: "Partially meets targets; improvement needed in key areas", v: "warning" },
    { s: 3, l: "Meets Expectations", d: "Consistently delivers expected performance across all areas", v: "neutral" },
    { s: 4, l: "Exceeds Expectations", d: "Regularly surpasses targets; strong contributor", v: "default" },
    { s: 5, l: "Outstanding", d: "Exceptional performance; role model for peers", v: "success" },
]
const RL: Record<number, { label: string; color: string }> = {
    1: { label: "Needs Improvement", color: "text-danger" }, 2: { label: "Below Expectations", color: "text-warning" },
    3: { label: "Meets Expectations", color: "text-text" }, 4: { label: "Exceeds Expectations", color: "text-accent" },
    5: { label: "Outstanding", color: "text-success" },
}
const SIX_NARR = ["Top 3 Achievements This Period", "Key Challenges Faced", "What Support Do You Need?", "Professional Development Goals"]
const ANN_NARR = ["Top 5 Achievements This Year", "Key Challenges & How You Addressed Them", "New Skills / Certifications Acquired", "Client Feedback Highlights (if any)", "Support Needed from Management", "Career Goals for Next Year"]

function buildGrid(months: string[]) { return METRICS.map(() => months.map(() => 0)) }
function totalOrAvg(row: number[], isAvg: boolean) {
    const f = row.filter(v => v > 0)
    if (!f.length) return "-"
    return isAvg ? (f.reduce((a, b) => a + b, 0) / f.length).toFixed(1) : String(f.reduce((a, b) => a + b, 0))
}
function pct(a: number, b: number) { return b === 0 ? "-" : `${((a / b) * 100).toFixed(1)}%` }
function deriveKPIs(g: number[][]) {
    const t = (i: number) => g[i]?.reduce((a, b) => a + b, 0) ?? 0
    const m = g[0]?.length ?? 0
    return [pct(t(3), t(2)), pct(t(5), t(4)), pct(t(7), t(5)), pct(t(7), t(0)), m > 0 ? (t(7) / m).toFixed(1) : "-", "-"]
}

function SH({ label, children }: { label: string; children?: React.ReactNode }) {
    return (<div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-text-3 uppercase tracking-wider">{label}</h3>{children}</div>)
}

function ScoreSel({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
    return (
        <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" disabled={disabled} onClick={() => onChange(n)}
                    className={cn("w-7 h-7 rounded-full border-2 text-xs font-bold transition-all duration-200",
                        value === n ? "border-purple bg-purple text-white scale-110"
                            : disabled ? "border-border text-text-4 cursor-not-allowed opacity-50"
                                : "border-border hover:border-purple/50 text-text-3 hover:text-purple cursor-pointer")}>{n}</button>
            ))}
        </div>
    )
}

function CompTable({ title, items, selfS, mgrS, cmts, onSelf, onMgr, onCmt, canSelf, canMgr }: {
    title: string; items: string[]; selfS: number[]; mgrS: number[]; cmts: string[]
    onSelf: (i: number, v: number) => void; onMgr: (i: number, v: number) => void; onCmt: (i: number, v: string) => void; canSelf: boolean; canMgr: boolean
}) {
    const sa = selfS.filter(s => s > 0), ma = mgrS.filter(s => s > 0)
    const sAvg = sa.length ? (sa.reduce((a, b) => a + b, 0) / sa.length).toFixed(1) : "-"
    const mAvg = ma.length ? (ma.reduce((a, b) => a + b, 0) / ma.length).toFixed(1) : "-"
    return (
        <div>
            <SH label={title}>
                <div className="flex gap-3">
                    {sAvg !== "-" && <Badge variant="purple" size="sm">Self Avg: {sAvg}</Badge>}
                    {mAvg !== "-" && <Badge variant="default" size="sm">Mgr Avg: {mAvg}</Badge>}
                </div>
            </SH>
            <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead><tr className="bg-surface-2 border-b border-border">
                        <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-10">S.No.</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[30%]">Core Competency</th>
                        <th className="px-2 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[20%]">Self Score</th>
                        <th className="px-2 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[20%]">Mgr Score</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider">Comments</th>
                    </tr></thead>
                    <tbody>{items.map((c, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                            <td className="px-3 py-2.5 text-center text-xs text-text-4 font-medium">{i + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-text">{c}</td>
                            <td className="px-2 py-2.5"><ScoreSel value={selfS[i]} onChange={v => onSelf(i, v)} disabled={!canSelf} /></td>
                            <td className="px-2 py-2.5"><ScoreSel value={mgrS[i]} onChange={v => onMgr(i, v)} disabled={!canMgr} /></td>
                            <td className="px-3 py-2.5"><input className="input-base text-sm py-1.5" value={cmts[i]} onChange={e => onCmt(i, e.target.value)} placeholder="Optional..." /></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    )
}

const setAt = <T,>(arr: T[], i: number, v: T) => arr.map((x, j) => j === i ? v : x)

export function AppraisalForm({ employees, onSubmit, onCancel, reviewType, isHR = false, isManager = false, isEmployee = false, existingData }: AppraisalFormProps) {
    const months = reviewType === "ANNUAL" ? ANNUAL_MO : SIX_MO
    const isTeamLead = existingData?.isTeamLead ?? false
    const narrativeLabels = reviewType === "ANNUAL" ? ANN_NARR : SIX_NARR

    const [employeeId, setEmployeeId] = React.useState(existingData?.employeeId ?? "")
    const emp = employees.find(e => e.id === employeeId)
    const period = React.useMemo(() => {
        const y = new Date().getFullYear()
        if (reviewType === "ANNUAL") return `Apr ${y - 1} - Mar ${y}`
        return new Date().getMonth() < 9 ? `Apr ${y} - Sep ${y}` : `Oct ${y} - Mar ${y + 1}`
    }, [reviewType])

    const [grid, setGrid] = React.useState<number[][]>(() => existingData?.monthlySummary ?? buildGrid(months))
    const updateCell = (r: number, c: number, v: string) => { const n = v === "" ? 0 : Number(v); if (!isNaN(n)) setGrid(p => p.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? n : cell) : row)) }

    const [kpiTargets, setKpiTargets] = React.useState<string[]>(() => existingData?.kpiTargets ?? KPI_ROWS.map(() => ""))
    const [kpiRemarks, setKpiRemarks] = React.useState<string[]>(() => existingData?.kpiRemarks ?? KPI_ROWS.map(() => ""))
    const derived = React.useMemo(() => deriveKPIs(grid), [grid])

    const [rSelf, setRSelf] = React.useState<number[]>(() => existingData?.recruiterSelfScores ?? REC_COMP.map(() => 0))
    const [rMgr, setRMgr] = React.useState<number[]>(() => existingData?.recruiterMgrScores ?? REC_COMP.map(() => 0))
    const [rCmt, setRCmt] = React.useState<string[]>(() => existingData?.recruiterComments ?? REC_COMP.map(() => ""))
    const [lSelf, setLSelf] = React.useState<number[]>(() => existingData?.leadSelfScores ?? TL_COMP.map(() => 0))
    const [lMgr, setLMgr] = React.useState<number[]>(() => existingData?.leadMgrScores ?? TL_COMP.map(() => 0))
    const [lCmt, setLCmt] = React.useState<string[]>(() => existingData?.leadComments ?? TL_COMP.map(() => ""))
    const [narratives, setNarratives] = React.useState<string[]>(() => existingData?.narratives ?? narrativeLabels.map(() => ""))

    const [hrRating, setHrRating] = React.useState<number>(existingData?.hrRating ?? 0)
    const [hrStrengths, setHrStrengths] = React.useState(existingData?.hrStrengths ?? "")
    const [hrDevAreas, setHrDevAreas] = React.useState(existingData?.hrDevAreas ?? "")
    const [hrGoals, setHrGoals] = React.useState(existingData?.hrGoals ?? "")
    const [hrTraining, setHrTraining] = React.useState(existingData?.hrTraining ?? "")
    const [hrPromotion, setHrPromotion] = React.useState(existingData?.hrPromotion ?? "")
    const [hrSalary, setHrSalary] = React.useState(existingData?.hrSalary ?? "")
    const [hrDecision, setHrDecision] = React.useState(existingData?.hrDecision ?? "")
    const [hrRemarks, setHrRemarks] = React.useState(existingData?.hrRemarks ?? "")
    const sigs = existingData?.signatures ?? { employee: null, manager: null, hr: null }
    const [submitting, setSubmitting] = React.useState(false)

    const handleSubmit = async () => {
        if (!employeeId) { toast.error("Please select an employee"); return }
        setSubmitting(true)
        try {
            await onSubmit({
                employee_id: employeeId, review_type: reviewType, review_period: period,
                monthly_summary: grid, kpi_targets: kpiTargets, kpi_achieved: derived, kpi_remarks: kpiRemarks,
                recruiter_self_scores: rSelf, recruiter_mgr_scores: rMgr, recruiter_comments: rCmt,
                lead_self_scores: isTeamLead ? lSelf : null, lead_mgr_scores: isTeamLead ? lMgr : null, lead_comments: isTeamLead ? lCmt : null,
                narratives, hr_rating: isHR ? hrRating : null, hr_strengths: isHR ? hrStrengths : null,
                hr_dev_areas: isHR ? hrDevAreas : null, hr_goals: isHR ? hrGoals : null,
                hr_training: isHR ? hrTraining : null, hr_promotion: isHR ? hrPromotion : null,
                hr_salary: isHR ? hrSalary : null, hr_decision: isHR ? hrDecision : null,
                hr_remarks: isHR ? hrRemarks : null, is_team_lead: isTeamLead,
            })
        } finally { setSubmitting(false) }
    }

    return (
        <div className="space-y-8">
            {/* SECTION A - Employee Information */}
            <div className="bg-gradient-to-r from-purple/5 to-accent/5 border border-purple/10 rounded-xl p-5">
                <SH label="Section A - Employee Information">
                    <Badge variant={reviewType === "ANNUAL" ? "purple" : "default"} size="lg">
                        {reviewType === "ANNUAL" ? "Annual Appraisal" : "Six-Monthly Appraisal"}
                    </Badge>
                </SH>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {isEmployee
                        ? <Input label="Employee Name" value={emp ? `${emp.firstName} ${emp.lastName}` : "-"} disabled />
                        : <Select label="Employee *" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                            <option value="">Select Employee...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                        </Select>}
                    <Input label="Employee ID" value={emp?.employeeCode ?? "-"} disabled />
                    <Input label="Designation" value={emp?.designation ?? "-"} disabled />
                    <Input label="Department" value={emp?.department?.name ?? "-"} disabled />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <Input label="Reporting Manager" value={emp?.reportingTo ? `${emp.reportingTo.firstName} ${emp.reportingTo.lastName}` : "-"} disabled />
                    <Input label="Date of Joining" value={emp?.dateOfJoining ? format(new Date(emp.dateOfJoining), "dd MMM yyyy") : "-"} disabled />
                    <Input label="Review Period" value={period} disabled />
                    <Input label="Review Type" value={reviewType === "ANNUAL" ? "Annual" : "Six-Monthly"} disabled />
                </div>
            </div>

            {/* SECTION B - Monthly Performance Summary */}
            <div>
                <SH label="Section B - Monthly Performance Summary" />
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[800px]">
                            <thead><tr className="bg-surface-2 border-b border-border">
                                <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider sticky left-0 bg-surface-2 z-10 min-w-[200px]">Metric</th>
                                {months.map(m => <th key={m} className="px-2 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider min-w-[70px]">{m}</th>)}
                                <th className="px-2 py-2.5 text-xs font-bold text-accent text-center uppercase tracking-wider min-w-[80px] bg-accent/5">Total/Avg</th>
                            </tr></thead>
                            <tbody>{METRICS.map((metric, ri) => (
                                <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                                    <td className="px-3 py-2 text-sm font-medium text-text sticky left-0 bg-surface z-10">
                                        <span className="text-xs text-text-4 mr-1.5">{ri + 1}.</span>{metric}
                                    </td>
                                    {months.map((_, ci) => (
                                        <td key={ci} className="px-1 py-1.5 text-center">
                                            <input type="number" min={0} className="input-base text-sm py-1 text-center w-full max-w-[60px] mx-auto"
                                                value={grid[ri]?.[ci] || ""} onChange={e => updateCell(ri, ci, e.target.value)} />
                                        </td>
                                    ))}
                                    <td className="px-2 py-2 text-center bg-accent/5">
                                        <span className="text-sm font-bold text-accent">{totalOrAvg(grid[ri] ?? [], ri === 8)}</span>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* SECTION C - Conversion & Efficiency KPIs */}
            <div>
                <SH label="Section C - Conversion & Efficiency KPIs" />
                <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead><tr className="bg-surface-2 border-b border-border">
                            <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-10">S.No.</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[30%]">Key Performance Indicator</th>
                            <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[15%]">Target</th>
                            <th className="px-3 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-[15%]">Achieved</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider">HR Remarks</th>
                        </tr></thead>
                        <tbody>{KPI_ROWS.map((kpi, i) => (
                            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                                <td className="px-3 py-2.5 text-center text-xs text-text-4 font-medium">{i + 1}</td>
                                <td className="px-4 py-2.5 text-sm font-medium text-text">{kpi}</td>
                                <td className="px-2 py-1.5"><input className="input-base text-sm py-1.5 text-center" value={kpiTargets[i]}
                                    onChange={e => setKpiTargets(p => setAt(p, i, e.target.value))} placeholder="e.g. 60%" /></td>
                                <td className="px-2 py-2.5 text-center"><span className="text-sm font-bold text-accent">{derived[i]}</span></td>
                                <td className="px-3 py-1.5"><input className="input-base text-sm py-1.5" value={kpiRemarks[i]}
                                    onChange={e => setKpiRemarks(p => setAt(p, i, e.target.value))} placeholder={isHR ? "Enter remarks..." : ""} disabled={!isHR} /></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>

            {/* SECTION D - Competency Assessment: Recruiter */}
            <CompTable title="Section D - Competency Assessment - Recruiter" items={REC_COMP}
                selfS={rSelf} mgrS={rMgr} cmts={rCmt}
                onSelf={(i, v) => setRSelf(p => setAt(p, i, v))} onMgr={(i, v) => setRMgr(p => setAt(p, i, v))} onCmt={(i, v) => setRCmt(p => setAt(p, i, v))}
                canSelf={isEmployee || isManager} canMgr={isManager || isHR} />

            {/* SECTION E - Competency Assessment: Team Lead (conditional) */}
            {isTeamLead && <CompTable title="Section E - Competency Assessment - Team Lead" items={TL_COMP}
                selfS={lSelf} mgrS={lMgr} cmts={lCmt}
                onSelf={(i, v) => setLSelf(p => setAt(p, i, v))} onMgr={(i, v) => setLMgr(p => setAt(p, i, v))} onCmt={(i, v) => setLCmt(p => setAt(p, i, v))}
                canSelf={isEmployee || isManager} canMgr={isManager || isHR} />}

            {/* SECTION F - Self-Assessment Narrative */}
            <div>
                <SH label="Section F - Self-Assessment Narrative" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {narrativeLabels.map((label, i) => (
                        <Textarea key={label} label={label} value={narratives[i]}
                            onChange={e => setNarratives(p => setAt(p, i, e.target.value))}
                            placeholder={isEmployee ? "Enter your response..." : ""} disabled={!isEmployee} rows={4} />
                    ))}
                </div>
            </div>

            {/* SECTION G - Rating Scale Reference */}
            <div>
                <SH label="Section G - Rating Scale Reference" />
                <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead><tr className="bg-surface-2 border-b border-border">
                            <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-center uppercase tracking-wider w-16">Score</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider w-[25%]">Rating</th>
                            <th className="px-4 py-2.5 text-xs font-bold text-text-3 text-left uppercase tracking-wider">Description</th>
                        </tr></thead>
                        <tbody>{SCALE.map(r => (
                            <tr key={r.s} className="border-b border-border/50 last:border-0">
                                <td className="px-4 py-2.5 text-center"><Badge variant={r.v} size="sm">{r.s}</Badge></td>
                                <td className="px-4 py-2.5 text-sm font-semibold text-text">{r.l}</td>
                                <td className="px-4 py-2.5 text-sm text-text-3">{r.d}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>

            {/* SECTION H - HR Reviewer Assessment */}
            {isHR && (
                <div>
                    <SH label="Section H - HR Reviewer Assessment" />
                    <div className="bg-gradient-to-r from-accent/5 to-purple/5 border border-accent/10 rounded-xl p-5 space-y-6">
                        <div>
                            <label className="text-sm font-medium text-text-2 mb-3 block">Overall Numeric Rating (1-5)</label>
                            <div className="flex items-center justify-center gap-4">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} type="button" onClick={() => setHrRating(n)}
                                        className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]",
                                            hrRating === n ? "border-accent bg-accent/5 scale-105 shadow-md" : "border-border hover:border-accent/30")}>
                                        <span className={cn("text-2xl font-extrabold", hrRating === n ? "text-accent" : "text-text-3")}>{n}</span>
                                        <span className={cn("text-xs font-medium text-center", hrRating === n ? RL[n].color : "text-text-4")}>{RL[n].label}</span>
                                    </button>
                                ))}
                            </div>
                            {hrRating > 0 && <div className="mt-3 text-center">
                                <Badge variant={hrRating >= 4 ? "success" : hrRating >= 3 ? "default" : "warning"} size="lg">Final Rating: {RL[hrRating]?.label}</Badge>
                            </div>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Textarea label="Key Strengths" value={hrStrengths} onChange={e => setHrStrengths(e.target.value)} rows={3} placeholder="Identify key strengths..." />
                            <Textarea label="Development Areas" value={hrDevAreas} onChange={e => setHrDevAreas(e.target.value)} rows={3} placeholder="Areas for development..." />
                            <Textarea label="Goals for Next Review Period" value={hrGoals} onChange={e => setHrGoals(e.target.value)} rows={3} placeholder="Set goals..." />
                            <Textarea label="Training / Upskilling Recommended" value={hrTraining} onChange={e => setHrTraining(e.target.value)} rows={3} placeholder="Recommend training..." />
                            <Textarea label="Promotion / Role Change Recommendation" value={hrPromotion} onChange={e => setHrPromotion(e.target.value)} rows={3} placeholder="Any promotion or role change..." />
                            <Textarea label="Salary Revision Recommendation" value={hrSalary} onChange={e => setHrSalary(e.target.value)} rows={3} placeholder="Salary recommendation..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Select label="Appreciation / Performance Alert Decision" value={hrDecision} onChange={e => setHrDecision(e.target.value)}>
                                <option value="">Select...</option>
                                <option value="Appreciation">Appreciation</option>
                                <option value="Satisfactory">Satisfactory</option>
                                <option value="Alert">Alert</option>
                            </Select>
                            <Textarea label="Additional HR Remarks" value={hrRemarks} onChange={e => setHrRemarks(e.target.value)} rows={3} placeholder="Any additional remarks..." />
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION I - Signatures & Acknowledgement */}
            <div>
                <SH label="Section I - Signatures & Acknowledgement" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {([["Employee", sigs.employee], ["Reporting Manager", sigs.manager], ["HR Officer", sigs.hr]] as const).map(([role, data]) => (
                        <div key={role} className="border border-border rounded-xl p-4 text-center">
                            <p className="text-xs font-bold text-text-3 uppercase tracking-wider mb-3">{role}</p>
                            {data ? (<>
                                <p className="text-sm font-medium text-text">{(data as any).name}</p>
                                <p className="text-xs text-text-4 mt-1">Signed: {format(new Date((data as any).date), "dd MMM yyyy")}</p>
                                <Badge variant="success" size="sm" className="mt-2">Signed</Badge>
                            </>) : (<>
                                <p className="text-sm text-text-4">Not yet signed</p>
                                <Badge variant="neutral" size="sm" className="mt-2">Pending</Badge>
                            </>)}
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                    {hrRating > 0 && isHR && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-3">HR Rating:</span>
                            <span className={cn("text-lg font-extrabold", RL[hrRating]?.color)}>{hrRating} / 5</span>
                            <Badge variant={hrRating >= 4 ? "success" : hrRating >= 3 ? "default" : "warning"} size="sm">{RL[hrRating]?.label}</Badge>
                        </div>
                    )}
                    <Badge variant={existingData?.status === "COMPLETED" ? "success" : "neutral"} size="sm" dot>{existingData?.status ?? "Draft"}</Badge>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={submitting}>Submit {reviewType === "ANNUAL" ? "Annual" : "Six-Monthly"} Appraisal</Button>
                </div>
            </div>
        </div>
    )
}
