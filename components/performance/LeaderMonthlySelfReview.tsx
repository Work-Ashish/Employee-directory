"use client"

import * as React from "react"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ═══════ Types ═══════ */

interface TeamMemberRow {
    name: string
    role: string
    hires: string
    ttf: string
    oar: string
    submittals: string
    rating: string
    status: string
}

interface TeamComposition {
    totalRecruiters: string
    fullyRamped: string
    inRampUp: string
    onPipWatch: string
    highPerformers: string
    openHcSlots: string
}

interface KpiRow {
    metric: string
    monthlyTarget: string
    teamActual: string
    achievement: string
    perRecruiterAvg: string
    trend: string
}

interface CompetencyRow {
    name: string
    rating: number
    evidence: string
}

interface TeamHealthRow {
    engagement: string
    atRisk: string
    escalations: string
    attrition: string
    headcountGaps: string
    trainingNeeds: string
}

interface LeaderSelfReviewData {
    // Section 1
    leaderName: string
    titleLevel: string
    department: string
    businessUnit: string
    directManager: string
    reviewMonthYear: string
    totalTeamMembers: string
    reviewDate: string
    // Section 2
    teamComposition: TeamComposition
    teamMembers: TeamMemberRow[]
    teamTotals: { hires: string; ttf: string; oar: string; submittals: string; rating: string }
    // Section 3
    kpis: KpiRow[]
    // Section 4
    competencies: CompetencyRow[]
    weightedAvgScore: string
    // Section 5
    overallRating: number
    // Section 6
    teamHealth: TeamHealthRow
    // Section 7
    accomplishments: string
    areasForImprovement: string
    goalsNextMonth: string[]
    devTrainingPlan: string
    // Section 8
    seniorManagerComments: string
    leaderSelfAssessment: string
    agreedActionItems: string
    // Section 9
    leaderSignature: string
    leaderSignDate: string
    directorSignature: string
    directorSignDate: string
    hrPartner: string
    hrPartnerDate: string
}

const STATUS_OPTIONS = ["Active", "PIP", "Ramp-Up", "On Leave", "Vacant"]

const DEFAULT_KPIS = [
    "Total Team Hires",
    "Time-to-Fill — Team Avg (days)",
    "Time-to-Offer — Team Avg (days)",
    "Offer Acceptance Rate — Team Avg (%)",
    "Total Submittals / Candidates Presented",
    "Total Interviews Facilitated",
    "Requisitions Managed (Active)",
    "Requisitions Closed This Month",
    "Diversity Candidates Submitted (%)",
    "90-Day New Hire Retention Rate (%)",
    "Avg Hiring Manager Satisfaction Score (1-5)",
    "Avg Candidate Experience Score (1-5)",
    "Team Sourcing Activities (Calls + Emails)",
    "Recruiter Utilization / Capacity (%)",
]

const DEFAULT_COMPETENCIES = [
    "Team Performance Management & Accountability",
    "Coaching & Individual Development",
    "Requisition Load Balancing & Capacity Planning",
    "Sourcing Strategy & Market Intelligence",
    "Hiring Manager Relationship Management",
    "Diversity, Equity & Inclusion Leadership",
    "Process Compliance & ATS Governance",
    "Data-Driven Decision Making & Reporting",
    "Recruiter Retention & Engagement",
    "Stakeholder Communication & Executive Updates",
    "Cross-Functional Collaboration",
    "Innovation & Continuous Process Improvement",
]

const RATING_LABELS = [
    { value: 1, label: "1 – Needs Improvement" },
    { value: 2, label: "2 – Below Expectations" },
    { value: 3, label: "3 – Meets Expectations" },
    { value: 4, label: "4 – Exceeds Expectations" },
    { value: 5, label: "5 – Outstanding" },
]

/* ═══════ Props ═══════ */

interface Props {
    employeeId: string
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
}

/* ═══════════════════════════════════════════════════════════════
   LEADER MONTHLY SELF REVIEW
   ═══════════════════════════════════════════════════════════════ */

export function LeaderMonthlySelfReview({ employeeId, onSubmit, onCancel }: Props) {
    const [saving, setSaving] = React.useState(false)

    // Section 1
    const [leaderName, setLeaderName] = React.useState("")
    const [titleLevel, setTitleLevel] = React.useState("")
    const [department, setDepartment] = React.useState("")
    const [businessUnit, setBusinessUnit] = React.useState("")
    const [directManager, setDirectManager] = React.useState("")
    const [reviewMonthYear, setReviewMonthYear] = React.useState("")
    const [totalTeamMembers, setTotalTeamMembers] = React.useState("")
    const [reviewDate, setReviewDate] = React.useState(new Date().toISOString().split("T")[0])

    // Section 2
    const [teamComp, setTeamComp] = React.useState<TeamComposition>({
        totalRecruiters: "", fullyRamped: "", inRampUp: "", onPipWatch: "", highPerformers: "", openHcSlots: "",
    })
    const [teamMembers, setTeamMembers] = React.useState<TeamMemberRow[]>(
        Array.from({ length: 10 }, (_, i) => ({
            name: "", role: "", hires: "", ttf: "", oar: "", submittals: "", rating: "", status: "",
        }))
    )
    const [teamTotals, setTeamTotals] = React.useState({ hires: "", ttf: "", oar: "", submittals: "", rating: "" })

    // Section 3
    const [kpis, setKpis] = React.useState<KpiRow[]>(
        DEFAULT_KPIS.map(m => ({ metric: m, monthlyTarget: "", teamActual: "", achievement: "", perRecruiterAvg: "", trend: "" }))
    )

    // Section 4
    const [competencies, setCompetencies] = React.useState<CompetencyRow[]>(
        DEFAULT_COMPETENCIES.map(n => ({ name: n, rating: 0, evidence: "" }))
    )
    const [weightedAvg, setWeightedAvg] = React.useState("")

    // Section 5
    const [overallRating, setOverallRating] = React.useState(0)

    // Section 6
    const [teamHealth, setTeamHealth] = React.useState<TeamHealthRow>({
        engagement: "", atRisk: "", escalations: "", attrition: "", headcountGaps: "", trainingNeeds: "",
    })

    // Section 7
    const [accomplishments, setAccomplishments] = React.useState("")
    const [areasForImprovement, setAreasForImprovement] = React.useState("")
    const [goalsNextMonth, setGoalsNextMonth] = React.useState(["", "", ""])
    const [devTrainingPlan, setDevTrainingPlan] = React.useState("")

    // Section 8
    const [seniorManagerComments, setSeniorManagerComments] = React.useState("")
    const [leaderSelfAssessment, setLeaderSelfAssessment] = React.useState("")
    const [agreedActionItems, setAgreedActionItems] = React.useState("")

    // Section 9
    const [leaderSig, setLeaderSig] = React.useState("")
    const [leaderSigDate, setLeaderSigDate] = React.useState("")
    const [directorSig, setDirectorSig] = React.useState("")
    const [directorSigDate, setDirectorSigDate] = React.useState("")
    const [hrPartner, setHrPartner] = React.useState("")
    const [hrPartnerDate, setHrPartnerDate] = React.useState("")

    function updateTeamMember(idx: number, field: keyof TeamMemberRow, val: string) {
        setTeamMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m))
    }

    function updateKpi(idx: number, field: keyof KpiRow, val: string) {
        setKpis(prev => prev.map((k, i) => i === idx ? { ...k, [field]: val } : k))
    }

    function updateCompetency(idx: number, field: "rating" | "evidence", val: number | string) {
        setCompetencies(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c))
    }

    async function handleSubmit() {
        setSaving(true)
        try {
            await onSubmit({
                employeeId,
                reviewType: "SELF",
                formType: "LEADER_MONTHLY",
                formData: {
                    leaderName, titleLevel, department, businessUnit, directManager,
                    reviewMonthYear, totalTeamMembers, reviewDate,
                    teamComposition: teamComp,
                    teamMembers: teamMembers.filter(m => m.name.trim()),
                    teamTotals, kpis, competencies, weightedAvgScore: weightedAvg,
                    overallRating, teamHealth, accomplishments, areasForImprovement,
                    goalsNextMonth: goalsNextMonth.filter(g => g.trim()),
                    devTrainingPlan, seniorManagerComments, leaderSelfAssessment,
                    agreedActionItems,
                    signatures: {
                        leader: { name: leaderSig, date: leaderSigDate },
                        director: { name: directorSig, date: directorSigDate },
                        hrPartner: { name: hrPartner, date: hrPartnerDate },
                    },
                },
                rating: overallRating || 3,
            })
        } catch {
            toast.error("Failed to submit review")
        } finally {
            setSaving(false)
        }
    }

    /* ─── Section Header Helper ─── */
    const SectionHeader = ({ num, title, subtitle }: { num: number; title: string; subtitle?: string }) => (
        <div className="mb-4 mt-8 first:mt-0">
            <h3 className="text-sm font-bold text-text uppercase tracking-wide">
                SECTION {num} <span className="ml-2 text-text-3 normal-case font-normal italic text-xs">{subtitle || title}</span>
            </h3>
            <div className="h-px bg-border mt-2" />
        </div>
    )

    /* ─── Table header cell helper ─── */
    const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <th className={cn("bg-accent/15 text-accent text-[11px] font-semibold px-2 py-2", className)}>{children}</th>
    )

    return (
        <div className="space-y-2 max-w-5xl mx-auto">
            {/* ── Title ── */}
            <div className="text-center mb-6">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-text">
                    Team Lead & Manager
                </h2>
                <h3 className="text-sm font-bold text-accent uppercase">
                    Monthly Performance Review & Team Tracking Report
                </h3>
                <p className="text-xs text-text-3 italic mt-1">
                    Comprehensive leadership assessment aligned to team size and recruiter performance
                </p>
            </div>

            {/* ═══════ SECTION 1 — Leader Information ═══════ */}
            <SectionHeader num={1} title="Leader Information" />
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <tbody>
                        <tr className="border-b border-border">
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2 w-[160px]">Leader Name:</td>
                            <td className="px-2 py-1"><Input value={leaderName} onChange={e => setLeaderName(e.target.value)} className="text-xs h-7" /></td>
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2 w-[160px]">Title / Level:</td>
                            <td className="px-2 py-1"><Input value={titleLevel} onChange={e => setTitleLevel(e.target.value)} className="text-xs h-7" /></td>
                        </tr>
                        <tr className="border-b border-border">
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2">Department:</td>
                            <td className="px-2 py-1"><Input value={department} onChange={e => setDepartment(e.target.value)} className="text-xs h-7" /></td>
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2">Business Unit:</td>
                            <td className="px-2 py-1"><Input value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="text-xs h-7" /></td>
                        </tr>
                        <tr className="border-b border-border">
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2">Direct Manager:</td>
                            <td className="px-2 py-1"><Input value={directManager} onChange={e => setDirectManager(e.target.value)} className="text-xs h-7" /></td>
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2">Review Month / Year:</td>
                            <td className="px-2 py-1"><Input value={reviewMonthYear} onChange={e => setReviewMonthYear(e.target.value)} placeholder="e.g. March 2026" className="text-xs h-7" /></td>
                        </tr>
                        <tr>
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2">Total Team Members:</td>
                            <td className="px-2 py-1"><Input value={totalTeamMembers} onChange={e => setTotalTeamMembers(e.target.value)} className="text-xs h-7" /></td>
                            <td className="px-3 py-2 font-semibold text-text-2 bg-bg-2">Review Date:</td>
                            <td className="px-2 py-1"><Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="text-xs h-7" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══════ SECTION 2 — Team Composition Snapshot ═══════ */}
            <SectionHeader num={2} title="Team Composition Snapshot" />

            {/* Summary row */}
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <Th>Total Recruiters</Th>
                            <Th>Fully Ramped</Th>
                            <Th>In Ramp-Up (&lt;90d)</Th>
                            <Th>On PIP / Watch</Th>
                            <Th className="bg-blue-500/25 text-blue-700 dark:text-blue-300">High Performers (4-5★)</Th>
                            <Th>Open HC Slots</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {(["totalRecruiters", "fullyRamped", "inRampUp", "onPipWatch", "highPerformers", "openHcSlots"] as const).map(f => (
                                <td key={f} className="px-1 py-1 text-center">
                                    <Input value={teamComp[f]} onChange={e => setTeamComp(p => ({ ...p, [f]: e.target.value }))} className="text-xs h-7 text-center" />
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <p className="text-[10px] text-text-3 italic">Fill in headcount numbers for the review month. High Performers = anyone rated 4 or 5 in their individual rating.</p>

            {/* Member table */}
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <Th className="w-8 text-center">#</Th>
                            <Th className="text-left">Recruiter Name</Th>
                            <Th>Role</Th>
                            <Th>Hires</Th>
                            <Th>TTF (avg)</Th>
                            <Th>OAR %</Th>
                            <Th>Submittals</Th>
                            <Th>Rating (1-5)</Th>
                            <Th>Status</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamMembers.map((m, i) => (
                            <tr key={i} className="border-t border-border hover:bg-bg-2/50">
                                <td className="px-2 py-1 text-center text-text-3 font-medium">{i + 1}.</td>
                                <td className="px-1 py-1"><Input value={m.name} onChange={e => updateTeamMember(i, "name", e.target.value)} className="text-xs h-7" /></td>
                                <td className="px-1 py-1"><Input value={m.role} onChange={e => updateTeamMember(i, "role", e.target.value)} className="text-xs h-7" /></td>
                                <td className="px-1 py-1"><Input value={m.hires} onChange={e => updateTeamMember(i, "hires", e.target.value)} className="text-xs h-7 text-center w-14" /></td>
                                <td className="px-1 py-1"><Input value={m.ttf} onChange={e => updateTeamMember(i, "ttf", e.target.value)} className="text-xs h-7 text-center w-14" /></td>
                                <td className="px-1 py-1"><Input value={m.oar} onChange={e => updateTeamMember(i, "oar", e.target.value)} className="text-xs h-7 text-center w-14" /></td>
                                <td className="px-1 py-1"><Input value={m.submittals} onChange={e => updateTeamMember(i, "submittals", e.target.value)} className="text-xs h-7 text-center w-16" /></td>
                                <td className="px-1 py-1"><Input value={m.rating} onChange={e => updateTeamMember(i, "rating", e.target.value)} className="text-xs h-7 text-center w-12" /></td>
                                <td className="px-1 py-1">
                                    <select
                                        value={m.status}
                                        onChange={e => updateTeamMember(i, "status", e.target.value)}
                                        className="text-xs h-7 w-full rounded-md border border-border bg-surface px-1 text-text"
                                    >
                                        <option value="">—</option>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="border-t-2 border-border bg-bg-2 font-bold">
                            <td className="px-2 py-2" colSpan={2}>
                                <span className="text-xs font-bold text-text-2 uppercase">Team Totals / Averages</span>
                            </td>
                            <td></td>
                            <td className="px-1 py-1"><Input value={teamTotals.hires} onChange={e => setTeamTotals(p => ({ ...p, hires: e.target.value }))} className="text-xs h-7 text-center font-bold w-14" /></td>
                            <td className="px-1 py-1"><Input value={teamTotals.ttf} onChange={e => setTeamTotals(p => ({ ...p, ttf: e.target.value }))} className="text-xs h-7 text-center font-bold w-14" /></td>
                            <td className="px-1 py-1"><Input value={teamTotals.oar} onChange={e => setTeamTotals(p => ({ ...p, oar: e.target.value }))} className="text-xs h-7 text-center font-bold w-14" /></td>
                            <td className="px-1 py-1"><Input value={teamTotals.submittals} onChange={e => setTeamTotals(p => ({ ...p, submittals: e.target.value }))} className="text-xs h-7 text-center font-bold w-16" /></td>
                            <td className="px-1 py-1"><Input value={teamTotals.rating} onChange={e => setTeamTotals(p => ({ ...p, rating: e.target.value }))} className="text-xs h-7 text-center font-bold w-12" /></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p className="text-[10px] text-text-3 italic">Add or remove rows to match actual team size. Status options: Active | Ramp-Up | PIP | On Leave | Vacant</p>

            {/* ═══════ SECTION 3 — Leader KPI Scorecard ═══════ */}
            <SectionHeader num={3} title="Leader KPI Scorecard" subtitle="Leader KPI Scorecard — Team Aggregates" />
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <Th className="text-left w-[240px]">KPI / Metric</Th>
                            <Th>Monthly Target</Th>
                            <Th>Team Actual</Th>
                            <Th>% Achievement</Th>
                            <Th>Per-Recruiter Avg</Th>
                            <Th>Trend vs. Prior Mo.</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpis.map((kpi, i) => (
                            <tr key={i} className="border-t border-border hover:bg-bg-2/50">
                                <td className="px-3 py-1.5 font-medium text-text-2">{kpi.metric}</td>
                                <td className="px-1 py-1"><Input value={kpi.monthlyTarget} onChange={e => updateKpi(i, "monthlyTarget", e.target.value)} className="text-xs h-7 text-center" /></td>
                                <td className="px-1 py-1"><Input value={kpi.teamActual} onChange={e => updateKpi(i, "teamActual", e.target.value)} className="text-xs h-7 text-center" /></td>
                                <td className="px-1 py-1"><Input value={kpi.achievement} onChange={e => updateKpi(i, "achievement", e.target.value)} className="text-xs h-7 text-center" /></td>
                                <td className="px-1 py-1"><Input value={kpi.perRecruiterAvg} onChange={e => updateKpi(i, "perRecruiterAvg", e.target.value)} className="text-xs h-7 text-center" /></td>
                                <td className="px-1 py-1"><Input value={kpi.trend} onChange={e => updateKpi(i, "trend", e.target.value)} className="text-xs h-7 text-center" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ═══════ SECTION 4 — Leadership Competency Ratings ═══════ */}
            <SectionHeader num={4} title="Leadership Competency Ratings" />
            <p className="text-[10px] text-text-3 italic mb-2">
                Rating Scale: 1 = Needs Improvement &nbsp; 2 = Below Expectations &nbsp; 3 = Meets Expectations &nbsp; 4 = Exceeds Expectations &nbsp; 5 = Outstanding
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <Th className="text-left w-[240px]">Leadership Competency</Th>
                            <Th className="w-8">1</Th>
                            <Th className="w-8">2</Th>
                            <Th className="w-8">3</Th>
                            <Th className="w-8">4</Th>
                            <Th className="w-8">5</Th>
                            <Th className="text-left">Evidence / Examples</Th>
                            <Th className="w-16">Score (1-5)</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {competencies.map((comp, i) => (
                            <tr key={i} className="border-t border-border hover:bg-bg-2/50">
                                <td className="px-3 py-1.5 font-medium text-text-2">{comp.name}</td>
                                {[1, 2, 3, 4, 5].map(v => (
                                    <td key={v} className="text-center px-1 py-1">
                                        <button
                                            type="button"
                                            onClick={() => updateCompetency(i, "rating", comp.rating === v ? 0 : v)}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 transition-all text-[10px] font-bold",
                                                comp.rating === v
                                                    ? "border-accent bg-accent text-white scale-110"
                                                    : "border-border text-text-3 hover:border-accent/50"
                                            )}
                                        >
                                            {comp.rating === v ? "●" : "○"}
                                        </button>
                                    </td>
                                ))}
                                <td className="px-1 py-1">
                                    <Input value={comp.evidence} onChange={e => updateCompetency(i, "evidence", e.target.value)} placeholder="Evidence..." className="text-xs h-7" />
                                </td>
                                <td className="text-center text-xs font-semibold text-text-2">
                                    {comp.rating || "—"}
                                </td>
                            </tr>
                        ))}
                        {/* Weighted Average Row */}
                        <tr className="border-t-2 border-border bg-bg-2 font-bold">
                            <td className="px-3 py-2 text-xs font-bold text-text-2 uppercase" colSpan={6}>
                                Weighted Average Leadership Score
                            </td>
                            <td className="px-1 py-1">
                                <Input value={weightedAvg} onChange={e => setWeightedAvg(e.target.value)} className="text-xs h-7 font-bold" placeholder="Auto or manual..." />
                            </td>
                            <td className="text-center text-xs font-bold text-accent">
                                {weightedAvg || "—"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══════ SECTION 5 — Overall Leader Performance Rating ═══════ */}
            <SectionHeader num={5} title="Overall Leader Performance Rating" />
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            {RATING_LABELS.map(r => (
                                <th key={r.value} className={cn(
                                    "text-center px-3 py-2 font-semibold text-[11px]",
                                    r.value >= 4 ? "bg-blue-500/25 text-blue-700 dark:text-blue-300" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                )}>
                                    {r.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {RATING_LABELS.map(r => (
                                <td key={r.value} className="text-center px-3 py-3">
                                    <button
                                        type="button"
                                        onClick={() => setOverallRating(overallRating === r.value ? 0 : r.value)}
                                        className={cn(
                                            "w-7 h-7 rounded-full border-2 transition-all text-xs font-bold",
                                            overallRating === r.value
                                                ? "border-accent bg-accent text-white scale-110 shadow-md"
                                                : "border-border text-text-3 hover:border-accent/50"
                                        )}
                                    >
                                        {overallRating === r.value ? "●" : "○"}
                                    </button>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══════ SECTION 6 — Team Health, Risks & Escalations ═══════ */}
            <SectionHeader num={6} title="Team Health, Risks & Escalations" />
            <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-border">
                    {[
                        { label: "Engagement & Morale Signals:", field: "engagement" as const, color: "bg-accent/15 text-accent" },
                        { label: "At-Risk Recruiters / Concerns:", field: "atRisk" as const, color: "bg-accent/15 text-accent" },
                        { label: "Escalations / Issues to Report:", field: "escalations" as const, color: "bg-accent/15 text-accent" },
                    ].map(item => (
                        <div key={item.field}>
                            <div className={cn("px-3 py-1.5 text-xs font-bold border-b border-border", item.color)}>{item.label}</div>
                            <div className="p-2">
                                <Textarea
                                    value={teamHealth[item.field]}
                                    onChange={e => setTeamHealth(p => ({ ...p, [item.field]: e.target.value }))}
                                    rows={3} className="text-xs resize-none border-0 focus:ring-0 p-1"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                    {[
                        { label: "Attrition / Turnover This Month:", field: "attrition" as const, color: "bg-red-500/15 text-red-600 dark:text-red-400" },
                        { label: "Headcount Gaps / Hiring Needs:", field: "headcountGaps" as const, color: "bg-amber-600/20 text-amber-700 dark:text-amber-400" },
                        { label: "Training / Upskilling Needs:", field: "trainingNeeds" as const, color: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
                    ].map(item => (
                        <div key={item.field}>
                            <div className={cn("px-3 py-1.5 text-xs font-bold border-b border-border", item.color)}>{item.label}</div>
                            <div className="p-2">
                                <Textarea
                                    value={teamHealth[item.field]}
                                    onChange={e => setTeamHealth(p => ({ ...p, [item.field]: e.target.value }))}
                                    rows={3} className="text-xs resize-none border-0 focus:ring-0 p-1"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════ SECTION 7 — Leader Goals, Development & Planning ═══════ */}
            <SectionHeader num={7} title="Leader Goals, Development & Planning" />
            <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-border">
                    <div>
                        <div className="bg-amber-600/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-bold border-b border-border">Key Accomplishments This Month:</div>
                        <div className="p-2"><Textarea value={accomplishments} onChange={e => setAccomplishments(e.target.value)} rows={4} className="text-xs resize-none border-0 focus:ring-0 p-1" /></div>
                    </div>
                    <div>
                        <div className="bg-amber-600/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-bold border-b border-border">Areas for Leader Improvement:</div>
                        <div className="p-2"><Textarea value={areasForImprovement} onChange={e => setAreasForImprovement(e.target.value)} rows={4} className="text-xs resize-none border-0 focus:ring-0 p-1" /></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                    <div>
                        <div className="bg-accent/15 text-accent px-3 py-1.5 text-xs font-bold border-b border-border">Leader Goals for Next Month:</div>
                        <div className="p-3 space-y-1.5">
                            {goalsNextMonth.map((g, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-text-3 font-medium w-4">{i + 1}.</span>
                                    <Input value={g} onChange={e => setGoalsNextMonth(p => p.map((v, j) => j === i ? e.target.value : v))} className="text-xs h-7" placeholder={`Goal ${i + 1}...`} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="bg-accent/15 text-accent px-3 py-1.5 text-xs font-bold border-b border-border">Leader Development / Training Plan:</div>
                        <div className="p-2"><Textarea value={devTrainingPlan} onChange={e => setDevTrainingPlan(e.target.value)} rows={4} className="text-xs resize-none border-0 focus:ring-0 p-1" /></div>
                    </div>
                </div>
            </div>

            {/* ═══════ SECTION 8 — Feedback & Commentary ═══════ */}
            <SectionHeader num={8} title="Feedback & Commentary" />
            <div className="rounded-lg border border-border overflow-hidden space-y-0">
                {[
                    { label: "Senior Manager / Director Comments:", value: seniorManagerComments, set: setSeniorManagerComments, color: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
                    { label: "Leader Self-Assessment / Response:", value: leaderSelfAssessment, set: setLeaderSelfAssessment, color: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
                    { label: "Agreed Action Items & Commitments:", value: agreedActionItems, set: setAgreedActionItems, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
                ].map((item, i) => (
                    <div key={i} className={i > 0 ? "border-t border-border" : ""}>
                        <div className={cn("px-3 py-1.5 text-xs font-bold border-b border-border", item.color)}>{item.label}</div>
                        <div className="p-2"><Textarea value={item.value} onChange={e => item.set(e.target.value)} rows={3} className="text-xs resize-none border-0 focus:ring-0 p-1" /></div>
                    </div>
                ))}
            </div>

            {/* ═══════ SECTION 9 — Sign-Off & Acknowledgment ═══════ */}
            <SectionHeader num={9} title="Sign-Off & Acknowledgment" />
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <Th className="text-left">Team Lead / Manager Signature:</Th>
                            <Th className="text-left">Reviewing Director Signature:</Th>
                            <Th className="text-left">HR Business Partner:</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-t border-border">
                            <td className="px-2 py-2"><Input value={leaderSig} onChange={e => setLeaderSig(e.target.value)} className="text-xs h-8" placeholder="Type name..." /></td>
                            <td className="px-2 py-2"><Input value={directorSig} onChange={e => setDirectorSig(e.target.value)} className="text-xs h-8" placeholder="Type name..." /></td>
                            <td className="px-2 py-2"><Input value={hrPartner} onChange={e => setHrPartner(e.target.value)} className="text-xs h-8" placeholder="Type name..." /></td>
                        </tr>
                        <tr className="border-t border-border">
                            <td className="px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-text-3 font-semibold">Date:</span>
                                    <Input type="date" value={leaderSigDate} onChange={e => setLeaderSigDate(e.target.value)} className="text-xs h-7 flex-1" />
                                </div>
                            </td>
                            <td className="px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-text-3 font-semibold">Date:</span>
                                    <Input type="date" value={directorSigDate} onChange={e => setDirectorSigDate(e.target.value)} className="text-xs h-7 flex-1" />
                                </div>
                            </td>
                            <td className="px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-text-3 font-semibold">Date:</span>
                                    <Input type="date" value={hrPartnerDate} onChange={e => setHrPartnerDate(e.target.value)} className="text-xs h-7 flex-1" />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-end gap-3 pt-6 pb-4">
                <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                    {saving ? "Submitting…" : "Submit Review"}
                </Button>
            </div>
        </div>
    )
}
