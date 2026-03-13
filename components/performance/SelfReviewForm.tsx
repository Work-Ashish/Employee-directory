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

/* ───────── Types ───────── */

interface TeamMemberRow {
    name: string; role: string; hires: string; ttfAvg: string
    oarPercent: string; submittals: string; rating: number; status: string
}

interface KPIRow {
    kpi: string; monthlyTarget: string; teamActual: string
    achievement: number; perRecruiterAvg: string; trend: "up" | "down" | "same"
}

interface CompetencyRating { competency: string; rating: number; evidence: string }

/* ───────── Constants ───────── */

const EMPTY_MEMBER: TeamMemberRow = {
    name: "", role: "", hires: "", ttfAvg: "", oarPercent: "", submittals: "", rating: 0, status: ""
}

const STATUS_OPTIONS = ["Active", "Ramp-Up", "PIP", "On Leave", "Vacant"]

const DEFAULT_KPIS = [
    "Total Team Hires", "Time-to-Fill — Team Avg (days)", "Time-to-Offer — Team Avg (days)",
    "Offer Acceptance Rate — Team Avg (%)", "Total Submittals / Candidates Presented",
    "Total Interviews Facilitated", "Requisitions Managed (Active)", "Requisitions Closed This Month",
    "Diversity Candidates Submitted (%)", "90-Day New Hire Retention Rate (%)",
    "Avg Hiring Manager Satisfaction Score (1-5)", "Avg Candidate Experience Score (1-5)",
    "Team Sourcing Activities (Calls + Emails)", "Recruiter Utilization / Capacity (%)",
]

const DEFAULT_COMPETENCIES = [
    "Team Performance Management & Accountability", "Coaching & Individual Development",
    "Requisition Load Balancing & Capacity Planning", "Sourcing Strategy & Market Intelligence",
    "Hiring Manager Relationship Management", "Diversity, Equity & Inclusion Leadership",
    "Process Compliance & ATS Governance", "Data-Driven Decision Making & Reporting",
    "Recruiter Retention & Engagement", "Stakeholder Communication & Executive Updates",
    "Cross-Functional Collaboration", "Innovation & Continuous Process Improvement",
]

const OVERALL_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: "Needs Improvement", color: "text-danger" },
    2: { label: "Below Expectations", color: "text-warning" },
    3: { label: "Meets Expectations", color: "text-text" },
    4: { label: "Exceeds Expectations", color: "text-accent" },
    5: { label: "Outstanding", color: "text-success" },
}

const TREND_ICONS: Record<string, string> = { up: "↑", down: "↓", same: "→" }

/* ───────── Section Header helper ───────── */

function SectionHeader({ num, title }: { num: number; title: string }) {
    return (
        <div className="border-b-2 border-accent/20 pb-1 mb-4">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider">
                Section {num} <span className="font-normal text-text-3 italic ml-2">{title}</span>
            </h3>
        </div>
    )
}

/* ───────── Props ───────── */

interface SelfReviewFormProps {
    employeeId: string
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    defaultKpis?: string[]
    defaultCompetencies?: string[]
}

export function SelfReviewForm({ employeeId, onSubmit, onCancel, defaultKpis, defaultCompetencies }: SelfReviewFormProps) {
    /* ── Section 1: Leader Info ── */
    const [leaderName, setLeaderName] = React.useState("")
    const [titleLevel, setTitleLevel] = React.useState("")
    const [department, setDepartment] = React.useState("")
    const [businessUnit, setBusinessUnit] = React.useState("")
    const [directManager, setDirectManager] = React.useState("")
    const [reviewMonth, setReviewMonth] = React.useState(format(new Date(), "yyyy-MM"))
    const [totalTeamMembers, setTotalTeamMembers] = React.useState("")
    const [reviewDate, setReviewDate] = React.useState(format(new Date(), "yyyy-MM-dd"))

    /* ── Section 2: Team Composition ── */
    const [snapshot, setSnapshot] = React.useState({
        totalRecruiters: "", fullyRamped: "", inRampUp: "", onPipWatch: "", highPerformers: "", openHcSlots: "",
    })
    const updateSnap = (k: keyof typeof snapshot, v: string) => setSnapshot(p => ({ ...p, [k]: v }))
    const [teamMembers, setTeamMembers] = React.useState<TeamMemberRow[]>(() =>
        Array.from({ length: 5 }, () => ({ ...EMPTY_MEMBER }))
    )
    const addMember = () => setTeamMembers(p => [...p, { ...EMPTY_MEMBER }])
    const removeMember = (i: number) => setTeamMembers(p => p.filter((_, idx) => idx !== i))
    const updateMember = (i: number, f: keyof TeamMemberRow, v: string | number) =>
        setTeamMembers(p => p.map((m, idx) => idx === i ? { ...m, [f]: v } : m))

    const teamTotals = React.useMemo(() => {
        const filled = teamMembers.filter(m => m.name.trim())
        if (!filled.length) return { hires: 0, ttf: 0, oar: 0, submittals: 0, avgRating: 0 }
        const hires = filled.reduce((s, m) => s + (parseFloat(m.hires) || 0), 0)
        const ttf = filled.reduce((s, m) => s + (parseFloat(m.ttfAvg) || 0), 0) / filled.length
        const oar = filled.reduce((s, m) => s + (parseFloat(m.oarPercent) || 0), 0) / filled.length
        const submittals = filled.reduce((s, m) => s + (parseFloat(m.submittals) || 0), 0)
        const rated = filled.filter(m => m.rating > 0)
        const avgRating = rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : 0
        return { hires, ttf: Math.round(ttf * 10) / 10, oar: Math.round(oar * 10) / 10, submittals, avgRating: Math.round(avgRating * 10) / 10 }
    }, [teamMembers])

    /* ── Section 3: KPI Scorecard ── */
    const [kpis, setKpis] = React.useState<KPIRow[]>(() =>
        (defaultKpis || DEFAULT_KPIS).map(kpi => ({
            kpi, monthlyTarget: "", teamActual: "", achievement: 0, perRecruiterAvg: "", trend: "same" as const,
        }))
    )
    const updateKPI = (i: number, f: keyof KPIRow, v: string) => {
        setKpis(p => p.map((k, idx) => {
            if (idx !== i) return k
            const u = { ...k, [f]: v }
            if (f === "monthlyTarget" || f === "teamActual") {
                const t = parseFloat(f === "monthlyTarget" ? v : k.monthlyTarget)
                const a = parseFloat(f === "teamActual" ? v : k.teamActual)
                u.achievement = t > 0 && !isNaN(a) ? Math.round((a / t) * 100) : 0
            }
            return u
        }))
    }
    const updateKPITrend = (i: number, t: "up" | "down" | "same") =>
        setKpis(p => p.map((k, idx) => idx === i ? { ...k, trend: t } : k))

    /* ── Section 4: Leadership Competencies ── */
    const [competencies, setCompetencies] = React.useState<CompetencyRating[]>(() =>
        (defaultCompetencies || DEFAULT_COMPETENCIES).map(competency => ({ competency, rating: 0, evidence: "" }))
    )
    const updateCompRating = (i: number, r: number) =>
        setCompetencies(p => p.map((c, idx) => idx === i ? { ...c, rating: r } : c))
    const updateCompEvidence = (i: number, e: string) =>
        setCompetencies(p => p.map((c, idx) => idx === i ? { ...c, evidence: e } : c))

    const compAvg = React.useMemo(() => {
        const rated = competencies.filter(c => c.rating > 0)
        return rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 100) / 100 : 0
    }, [competencies])

    /* ── Section 5: Overall Rating ── */
    const [overallRating, setOverallRating] = React.useState(0)

    /* ── Section 6: Team Health ── */
    const [teamHealth, setTeamHealth] = React.useState({
        engagementMorale: "", atRiskRecruiters: "", escalations: "",
        attritionTurnover: "", headcountGaps: "", trainingNeeds: "",
    })
    const updateHealth = (k: keyof typeof teamHealth, v: string) => setTeamHealth(p => ({ ...p, [k]: v }))

    /* ── Section 7: Goals ── */
    const [accomplishments, setAccomplishments] = React.useState("")
    const [areasForImprovement, setAreasForImprovement] = React.useState("")
    const [goalsForNextMonth, setGoalsForNextMonth] = React.useState(["", "", ""])
    const [developmentPlan, setDevelopmentPlan] = React.useState("")

    /* ── Section 8: Feedback ── */
    const [seniorManagerComments, setSeniorManagerComments] = React.useState("")
    const [leaderSelfAssessment, setLeaderSelfAssessment] = React.useState("")
    const [agreedActionItems, setAgreedActionItems] = React.useState("")

    /* ── Section 9: Sign-Off ── */
    const [signOff, setSignOff] = React.useState({
        teamLeadName: "", teamLeadDate: "", directorName: "", directorDate: "", hrPartnerName: "", hrPartnerDate: "",
    })
    const updateSign = (k: keyof typeof signOff, v: string) => setSignOff(p => ({ ...p, [k]: v }))

    const [submitting, setSubmitting] = React.useState(false)

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (overallRating === 0) { toast.error("Please select an overall leader performance rating (Section 5)"); return }
        const unrated = competencies.filter(c => c.rating === 0)
        if (unrated.length > 0) { toast.error(`Please rate all leadership competencies (${unrated.length} unrated)`); return }

        setSubmitting(true)
        try {
            const [year, month] = reviewMonth.split("-")
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long" })
            const periodLabel = `${monthName} ${year}`

            const formData = {
                leaderInfo: { leaderName, titleLevel, department, businessUnit, directManager, totalTeamMembers },
                teamComposition: { snapshot, teamMembers: teamMembers.filter(m => m.name.trim()), teamTotals },
                kpiScorecard: kpis,
                competencyRatings: competencies, competencyAvg: compAvg,
                overallRating,
                teamHealth,
                goals: { accomplishments, areasForImprovement, goalsForNextMonth: goalsForNextMonth.filter(g => g.trim()), developmentPlan },
                feedback: { seniorManagerComments, leaderSelfAssessment, agreedActionItems },
                signOff,
            }

            await onSubmit({
                employeeId,
                rating: overallRating,
                progress: Math.round((overallRating / 5) * 100),
                comments: leaderSelfAssessment || "Monthly self-performance review",
                reviewDate: new Date(reviewDate),
                status: overallRating >= 4 ? "EXCELLENT" : overallRating >= 3 ? "GOOD" : "NEEDS_IMPROVEMENT",
                reviewType: "SELF",
                reviewPeriod: periodLabel,
                formType: "MONTHLY",
                formData,
            })
        } finally { setSubmitting(false) }
    }

    /* ─────────────────────── RENDER ─────────────────────── */

    return (
        <div className="space-y-10">
            {/* ══ SECTION 1 — Leader Information ══ */}
            <div>
                <SectionHeader num={1} title="Leader Information" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label="Leader Name" value={leaderName} onChange={e => setLeaderName(e.target.value)} placeholder="Full name" />
                    <Input label="Title / Level" value={titleLevel} onChange={e => setTitleLevel(e.target.value)} placeholder="e.g. Sr. Team Lead" />
                    <Input label="Department" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" />
                    <Input label="Business Unit" value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} placeholder="Business unit" />
                    <Input label="Direct Manager" value={directManager} onChange={e => setDirectManager(e.target.value)} placeholder="Manager name" />
                    <Input label="Review Month / Year" type="month" value={reviewMonth} onChange={e => setReviewMonth(e.target.value)} />
                    <Input label="Total Team Members" type="number" value={totalTeamMembers} onChange={e => setTotalTeamMembers(e.target.value)} placeholder="—" />
                    <Input label="Review Date" type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
                </div>
            </div>

            {/* ══ SECTION 2 — Team Composition Snapshot ══ */}
            <div>
                <SectionHeader num={2} title="Team Composition Snapshot" />

                {/* Summary grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                    {([
                        ["totalRecruiters", "Total Recruiters"],
                        ["fullyRamped", "Fully Ramped"],
                        ["inRampUp", "In Ramp-Up (<90d)"],
                        ["onPipWatch", "On PIP / Watch"],
                        ["highPerformers", "High Performers (4-5★)"],
                        ["openHcSlots", "Open HC Slots"],
                    ] as const).map(([key, label]) => (
                        <div key={key} className="bg-surface border border-border rounded-lg p-3 text-center">
                            <div className="text-[10px] font-bold text-text-3 uppercase tracking-wider mb-1">{label}</div>
                            <input
                                className="input-base text-center text-sm font-bold py-1 w-full"
                                value={snapshot[key]}
                                onChange={e => updateSnap(key, e.target.value)}
                                placeholder="—"
                            />
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-text-4 italic mb-3">Fill in headcount numbers for the review month. High Performers = anyone rated 4 or 5 in their individual rating.</p>

                {/* Team Member Table */}
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase w-8">#</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-left uppercase">Recruiter Name</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-left uppercase">Role</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase">Hires</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase">TTF (avg)</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase">OAR %</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase">Submittals</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase">Rating (1-5)</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-text-3 text-center uppercase">Status</th>
                                    <th className="px-2 py-2 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {teamMembers.map((m, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                                        <td className="px-3 py-1.5 text-center text-xs text-text-4 font-mono">{i + 1}.</td>
                                        <td className="px-2 py-1.5"><input className="input-base text-sm py-1" value={m.name} onChange={e => updateMember(i, "name", e.target.value)} placeholder="Name" /></td>
                                        <td className="px-2 py-1.5"><input className="input-base text-sm py-1" value={m.role} onChange={e => updateMember(i, "role", e.target.value)} placeholder="Role" /></td>
                                        <td className="px-2 py-1.5"><input className="input-base text-sm py-1 text-center w-16 mx-auto" value={m.hires} onChange={e => updateMember(i, "hires", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-1.5"><input className="input-base text-sm py-1 text-center w-16 mx-auto" value={m.ttfAvg} onChange={e => updateMember(i, "ttfAvg", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-1.5"><input className="input-base text-sm py-1 text-center w-16 mx-auto" value={m.oarPercent} onChange={e => updateMember(i, "oarPercent", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-1.5"><input className="input-base text-sm py-1 text-center w-16 mx-auto" value={m.submittals} onChange={e => updateMember(i, "submittals", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-1.5">
                                            <div className="flex justify-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button key={n} type="button" onClick={() => updateMember(i, "rating", n)}
                                                        className={cn("w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                                                            m.rating === n ? "bg-accent text-white" : "border border-border text-text-4 hover:border-accent/50"
                                                        )}>{n}</button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <select className="input-base text-xs py-1" value={m.status} onChange={e => updateMember(i, "status", e.target.value)}>
                                                <option value="">—</option>
                                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-1 py-1.5 text-center">
                                            <button type="button" onClick={() => removeMember(i)} className="p-0.5 text-text-4 hover:text-danger transition-colors">
                                                <Cross2Icon className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                <tr className="bg-surface-2 border-t border-border font-bold">
                                    <td colSpan={3} className="px-3 py-2 text-xs text-text uppercase">Team Totals / Averages</td>
                                    <td className="px-2 py-2 text-center text-xs text-accent">{teamTotals.hires || "—"}</td>
                                    <td className="px-2 py-2 text-center text-xs text-text-3">{teamTotals.ttf || "—"}</td>
                                    <td className="px-2 py-2 text-center text-xs text-text-3">{teamTotals.oar ? `${teamTotals.oar}%` : "—"}</td>
                                    <td className="px-2 py-2 text-center text-xs text-accent">{teamTotals.submittals || "—"}</td>
                                    <td className="px-2 py-2 text-center text-xs text-success">{teamTotals.avgRating || "—"}</td>
                                    <td colSpan={2} />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-text-4 italic">Add or remove rows to match actual team size. Status options: Active | Ramp-Up | PIP | On Leave | Vacant</p>
                    <Button variant="ghost" size="sm" onClick={addMember} leftIcon={<PlusIcon className="w-3 h-3" />}>Add Row</Button>
                </div>
            </div>

            {/* ══ SECTION 3 — Leader KPI Scorecard — Team Aggregates ══ */}
            <div>
                <SectionHeader num={3} title="Leader KPI Scorecard — Team Aggregates" />
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-text-3 text-left uppercase w-[28%]">KPI / Metric</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase w-[14%]">Monthly Target</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase w-[14%]">Team Actual</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase w-[12%]">% Achievement</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase w-[14%]">Per-Recruiter Avg</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase w-[14%]">Trend vs. Prior Mo.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpis.map((k, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                                        <td className="px-4 py-2"><span className="text-sm font-medium text-text">{k.kpi}</span></td>
                                        <td className="px-2 py-2"><input className="input-base text-sm py-1 text-center" value={k.monthlyTarget} onChange={e => updateKPI(i, "monthlyTarget", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-2"><input className="input-base text-sm py-1 text-center" value={k.teamActual} onChange={e => updateKPI(i, "teamActual", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-2 text-center">
                                            <span className={cn("text-sm font-bold",
                                                k.achievement >= 100 ? "text-success" : k.achievement >= 75 ? "text-accent" : k.achievement > 0 ? "text-warning" : "text-text-4"
                                            )}>{k.achievement > 0 ? `${k.achievement}%` : "—"}</span>
                                        </td>
                                        <td className="px-2 py-2"><input className="input-base text-sm py-1 text-center" value={k.perRecruiterAvg} onChange={e => updateKPI(i, "perRecruiterAvg", e.target.value)} placeholder="—" /></td>
                                        <td className="px-2 py-2">
                                            <div className="flex justify-center gap-1">
                                                {(["up", "down", "same"] as const).map(t => (
                                                    <button key={t} type="button" onClick={() => updateKPITrend(i, t)}
                                                        className={cn("w-7 h-7 rounded text-sm font-bold transition-all",
                                                            k.trend === t
                                                                ? t === "up" ? "bg-success/15 text-success" : t === "down" ? "bg-danger/15 text-danger" : "bg-text-4/15 text-text-3"
                                                                : "text-text-4 hover:bg-bg-2"
                                                        )}>{TREND_ICONS[t]}</button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ══ SECTION 4 — Leadership Competency Ratings ══ */}
            <div>
                <SectionHeader num={4} title="Leadership Competency Ratings" />
                <p className="text-xs text-text-4 mb-3">Rating Scale: <strong>1</strong> = Needs Improvement &nbsp; <strong>2</strong> = Below Expectations &nbsp; <strong>3</strong> = Meets Expectations &nbsp; <strong>4</strong> = Exceeds Expectations &nbsp; <strong>5</strong> = Outstanding</p>
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-text-3 text-left uppercase w-[30%]">Leadership Competency</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase" colSpan={5}>
                                        <div className="flex justify-between px-4">
                                            {[1, 2, 3, 4, 5].map(n => <span key={n} className="w-10 text-center">{n}</span>)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-text-3 text-left uppercase w-[25%]">Evidence / Examples</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold text-text-3 text-center uppercase w-[8%]">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {competencies.map((c, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                                        <td className="px-4 py-3"><span className="text-sm font-medium text-text">{c.competency}</span></td>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <td key={n} className="py-3 text-center">
                                                <button type="button" onClick={() => updateCompRating(i, n)}
                                                    className={cn("w-7 h-7 rounded-full border-2 transition-all text-xs font-bold",
                                                        c.rating === n
                                                            ? "border-accent bg-accent text-white scale-110"
                                                            : "border-border hover:border-accent/50 text-text-3 hover:text-accent"
                                                    )}>{n}</button>
                                            </td>
                                        ))}
                                        <td className="px-3 py-3">
                                            <input className="input-base text-sm py-1" value={c.evidence} onChange={e => updateCompEvidence(i, e.target.value)} placeholder="Evidence..." />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={cn("text-sm font-bold", c.rating >= 4 ? "text-success" : c.rating >= 3 ? "text-accent" : c.rating > 0 ? "text-warning" : "text-text-4")}>
                                                {c.rating || "—"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {/* Weighted average row */}
                                <tr className="bg-surface-2 border-t border-border font-bold">
                                    <td colSpan={7} className="px-4 py-2.5 text-xs text-text uppercase">Weighted Average Leadership Score</td>
                                    <td className="px-3 py-2.5 text-center">
                                        <Badge variant={compAvg >= 4 ? "success" : compAvg >= 3 ? "default" : compAvg > 0 ? "warning" : "neutral"}>
                                            {compAvg > 0 ? compAvg.toFixed(2) : "—"}
                                        </Badge>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ══ SECTION 5 — Overall Leader Performance Rating ══ */}
            <div>
                <SectionHeader num={5} title="Overall Leader Performance Rating" />
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-center gap-4">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} type="button" onClick={() => setOverallRating(n)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[110px]",
                                    overallRating === n ? "border-accent bg-accent/5 scale-105 shadow-md" : "border-border hover:border-accent/30"
                                )}>
                                <span className={cn("text-2xl font-extrabold", overallRating === n ? "text-accent" : "text-text-3")}>{n}</span>
                                <span className={cn("text-xs font-medium text-center leading-tight", overallRating === n ? OVERALL_LABELS[n].color : "text-text-4")}>
                                    {n} — {OVERALL_LABELS[n].label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ SECTION 6 — Team Health, Risks & Escalations ══ */}
            <div>
                <SectionHeader num={6} title="Team Health, Risks & Escalations" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Textarea label="Engagement & Morale Signals" value={teamHealth.engagementMorale} onChange={e => updateHealth("engagementMorale", e.target.value)} placeholder="Team engagement and morale observations..." rows={3} />
                    <Textarea label="At-Risk Recruiters / Concerns" value={teamHealth.atRiskRecruiters} onChange={e => updateHealth("atRiskRecruiters", e.target.value)} placeholder="Recruiters at risk of underperformance or attrition..." rows={3} />
                    <Textarea label="Escalations / Issues to Report" value={teamHealth.escalations} onChange={e => updateHealth("escalations", e.target.value)} placeholder="Issues requiring management attention..." rows={3} />
                    <Textarea label="Attrition / Turnover This Month" value={teamHealth.attritionTurnover} onChange={e => updateHealth("attritionTurnover", e.target.value)} placeholder="Any departures or turnover this month..." rows={3} />
                    <Textarea label="Headcount Gaps / Hiring Needs" value={teamHealth.headcountGaps} onChange={e => updateHealth("headcountGaps", e.target.value)} placeholder="Current headcount gaps or open positions..." rows={3} />
                    <Textarea label="Training / Upskilling Needs" value={teamHealth.trainingNeeds} onChange={e => updateHealth("trainingNeeds", e.target.value)} placeholder="Training or development needs identified..." rows={3} />
                </div>
            </div>

            {/* ══ SECTION 7 — Leader Goals, Development & Planning ══ */}
            <div>
                <SectionHeader num={7} title="Leader Goals, Development & Planning" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Textarea label="Key Accomplishments This Month" value={accomplishments} onChange={e => setAccomplishments(e.target.value)} placeholder="Major wins and accomplishments this month..." rows={4} />
                    <Textarea label="Areas for Leader Improvement" value={areasForImprovement} onChange={e => setAreasForImprovement(e.target.value)} placeholder="Areas where improvement is needed..." rows={4} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-text-2">Leader Goals for Next Month</label>
                        {goalsForNextMonth.map((g, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-accent w-5 shrink-0">{i + 1}.</span>
                                <input className="input-base text-sm" value={g} onChange={e => {
                                    const next = [...goalsForNextMonth]; next[i] = e.target.value; setGoalsForNextMonth(next)
                                }} placeholder={`Goal ${i + 1}`} />
                            </div>
                        ))}
                    </div>
                    <Textarea label="Leader Development / Training Plan" value={developmentPlan} onChange={e => setDevelopmentPlan(e.target.value)} placeholder="Planned training, certifications, or development activities..." rows={4} />
                </div>
            </div>

            {/* ══ SECTION 8 — Feedback & Commentary ══ */}
            <div>
                <SectionHeader num={8} title="Feedback & Commentary" />
                <div className="space-y-4">
                    <Textarea label="Senior Manager / Director Comments" value={seniorManagerComments} onChange={e => setSeniorManagerComments(e.target.value)} placeholder="Comments from senior manager or director..." rows={4} />
                    <Textarea label="Leader Self-Assessment / Response" value={leaderSelfAssessment} onChange={e => setLeaderSelfAssessment(e.target.value)} placeholder="Your self-assessment and response to feedback..." rows={4} />
                    <Textarea label="Agreed Action Items & Commitments" value={agreedActionItems} onChange={e => setAgreedActionItems(e.target.value)} placeholder="Action items and commitments agreed upon..." rows={4} />
                </div>
            </div>

            {/* ══ SECTION 9 — Sign-Off & Acknowledgment ══ */}
            <div>
                <SectionHeader num={9} title="Sign-Off & Acknowledgment" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3 bg-surface border border-border rounded-lg p-4">
                        <div className="text-xs font-bold text-text-3 uppercase">Team Lead / Manager Signature</div>
                        <Input label="Name" value={signOff.teamLeadName} onChange={e => updateSign("teamLeadName", e.target.value)} placeholder="Full name" />
                        <Input label="Date" type="date" value={signOff.teamLeadDate} onChange={e => updateSign("teamLeadDate", e.target.value)} />
                    </div>
                    <div className="space-y-3 bg-surface border border-border rounded-lg p-4">
                        <div className="text-xs font-bold text-text-3 uppercase">Reviewing Director Signature</div>
                        <Input label="Name" value={signOff.directorName} onChange={e => updateSign("directorName", e.target.value)} placeholder="Full name" />
                        <Input label="Date" type="date" value={signOff.directorDate} onChange={e => updateSign("directorDate", e.target.value)} />
                    </div>
                    <div className="space-y-3 bg-surface border border-border rounded-lg p-4">
                        <div className="text-xs font-bold text-text-3 uppercase">HR Business Partner</div>
                        <Input label="Name" value={signOff.hrPartnerName} onChange={e => updateSign("hrPartnerName", e.target.value)} placeholder="Full name" />
                        <Input label="Date" type="date" value={signOff.hrPartnerDate} onChange={e => updateSign("hrPartnerDate", e.target.value)} />
                    </div>
                </div>
            </div>

            {/* ══ FOOTER ══ */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                    {overallRating > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-3">Overall Rating:</span>
                            <span className={cn("text-lg font-extrabold", OVERALL_LABELS[overallRating]?.color)}>{overallRating} / 5</span>
                            <Badge variant={overallRating >= 4 ? "success" : overallRating >= 3 ? "default" : "warning"} size="sm">
                                {OVERALL_LABELS[overallRating]?.label}
                            </Badge>
                        </div>
                    )}
                    {compAvg > 0 && <span className="text-xs text-text-4">Leadership Avg: {compAvg.toFixed(2)}</span>}
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={submitting}>Submit Monthly Self Review</Button>
                </div>
            </div>
        </div>
    )
}
