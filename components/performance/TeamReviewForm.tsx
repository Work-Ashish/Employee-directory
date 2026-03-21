"use client"

import * as React from "react"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Cross2Icon, GearIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons"

/* ───────── Types ───────── */

interface Employee {
    id: string
    firstName: string
    lastName: string
    designation?: string
}

interface KpiRow {
    name: string
    target: string
    actual: string
    achvmt: string
    ttf: string
    oar: string
    trend: string
}

interface CompetencyRow {
    name: string
    rating: number // 0 = unset, 1-5
    notes: string
}

interface MemberReview {
    employeeId: string
    name: string
    role: string
    tenure: string
    reqsAssigned: string
    kpis: KpiRow[]
    competencies: CompetencyRow[]
    strengths: string
    gaps: string
    actionPlan: string
    overallRating: number // 0 = unset, 1-5
}

interface TeamReviewConfig {
    kpiNames: string[]
    competencyNames: string[]
}

const DEFAULT_KPIS = [
    "Hires Made",
    "Submittals",
    "Interviews Facilitated",
    "Offers Extended",
    "Pipeline Added",
]

const DEFAULT_COMPETENCIES = [
    "Pipeline Quality & Sourcing",
    "Candidate Communication",
    "HM Partnership",
    "Offer Conversion",
    "Process & Compliance",
]

const RATING_LABELS = [
    { value: 1, label: "1 – Needs Impr.", short: "1" },
    { value: 2, label: "2 – Below Exp.", short: "2" },
    { value: 3, label: "3 – Meets Exp.", short: "3" },
    { value: 4, label: "4 – Exceeds Exp.", short: "4" },
    { value: 5, label: "5 – Outstanding", short: "5" },
]

/* ───────── Helpers ───────── */

function buildEmptyMember(emp: Employee, config: TeamReviewConfig): MemberReview {
    return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.designation || "",
        tenure: "",
        reqsAssigned: "",
        kpis: config.kpiNames.map(n => ({ name: n, target: "", actual: "", achvmt: "", ttf: "", oar: "", trend: "" })),
        competencies: config.competencyNames.map(n => ({ name: n, rating: 0, notes: "" })),
        strengths: "",
        gaps: "",
        actionPlan: "",
        overallRating: 0,
    }
}

/* ───────── Props ───────── */

interface TeamReviewFormProps {
    open: boolean
    onClose: () => void
    employees: Employee[]
    onSubmit: (data: { reviews: MemberReview[], config: TeamReviewConfig }) => Promise<void>
}

/* ═══════════════════════════════════════════════════════════════
   TEAM REVIEW FORM
   ═══════════════════════════════════════════════════════════════ */

export function TeamReviewForm({ open, onClose, employees, onSubmit }: TeamReviewFormProps) {
    const [config, setConfig] = React.useState<TeamReviewConfig>({
        kpiNames: [...DEFAULT_KPIS],
        competencyNames: [...DEFAULT_COMPETENCIES],
    })
    const [reviews, setReviews] = React.useState<MemberReview[]>([])
    const [saving, setSaving] = React.useState(false)
    const [configOpen, setConfigOpen] = React.useState(false)

    // Initialize reviews from employees when dialog opens
    React.useEffect(() => {
        if (open && employees.length > 0) {
            setReviews(employees.map(emp => buildEmptyMember(emp, config)))
        }
    }, [open, employees]) // eslint-disable-line react-hooks/exhaustive-deps

    // Sync when config changes (add/remove KPI/competency rows)
    function applyConfigToReviews(newConfig: TeamReviewConfig) {
        setConfig(newConfig)
        setReviews(prev => prev.map(rev => {
            const kpis = newConfig.kpiNames.map(n => {
                const existing = rev.kpis.find(k => k.name === n)
                return existing || { name: n, target: "", actual: "", achvmt: "", ttf: "", oar: "", trend: "" }
            })
            const competencies = newConfig.competencyNames.map(n => {
                const existing = rev.competencies.find(c => c.name === n)
                return existing || { name: n, rating: 0, notes: "" }
            })
            return { ...rev, kpis, competencies }
        }))
    }

    function updateMember(idx: number, patch: Partial<MemberReview>) {
        setReviews(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
    }

    function updateKpi(memberIdx: number, kpiIdx: number, field: keyof KpiRow, value: string) {
        setReviews(prev => prev.map((r, mi) => {
            if (mi !== memberIdx) return r
            const kpis = r.kpis.map((k, ki) => ki === kpiIdx ? { ...k, [field]: value } : k)
            return { ...r, kpis }
        }))
    }

    function updateCompetency(memberIdx: number, compIdx: number, field: "rating" | "notes", value: number | string) {
        setReviews(prev => prev.map((r, mi) => {
            if (mi !== memberIdx) return r
            const competencies = r.competencies.map((c, ci) => ci === compIdx ? { ...c, [field]: value } : c)
            return { ...r, competencies }
        }))
    }

    async function handleSubmit() {
        setSaving(true)
        try {
            await onSubmit({ reviews, config })
            toast.success("Team review submitted successfully")
            onClose()
        } catch {
            toast.error("Failed to submit team review")
        } finally {
            setSaving(false)
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onClose={onClose} size="full">
            <DialogHeader>
                <div className="flex items-center justify-between w-full">
                    <DialogTitle>Individual Performance Deep-Dives</DialogTitle>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setConfigOpen(true)}
                            className="p-1.5 rounded-lg hover:bg-bg-2 text-text-3 hover:text-text transition"
                            title="Configure KPIs & Competencies"
                        >
                            <GearIcon className="w-4 h-4" />
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-2 text-text-3 hover:text-text transition">
                            <Cross2Icon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-text-3 mt-0.5">
                    Complete one block per team member — expand blocks as needed based on total team size
                </p>
            </DialogHeader>
            <DialogBody className="space-y-0 p-0">
                <div className="max-h-[75vh] overflow-y-auto px-6 py-4 space-y-8">
                    {reviews.map((member, mIdx) => (
                        <MemberBlock
                            key={member.employeeId}
                            index={mIdx}
                            member={member}
                            onUpdate={(patch) => updateMember(mIdx, patch)}
                            onKpiUpdate={(kIdx, field, val) => updateKpi(mIdx, kIdx, field, val)}
                            onCompUpdate={(cIdx, field, val) => updateCompetency(mIdx, cIdx, field, val)}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-surface">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? "Submitting…" : "Submit All Reviews"}
                    </Button>
                </div>
            </DialogBody>

            {/* Config Dialog */}
            {configOpen && (
                <ConfigEditor
                    config={config}
                    onSave={(c) => { applyConfigToReviews(c); setConfigOpen(false) }}
                    onClose={() => setConfigOpen(false)}
                />
            )}
        </Dialog>
    )
}

/* ═══════════════════════════════════════════════════════════════
   MEMBER BLOCK — one per team member
   ═══════════════════════════════════════════════════════════════ */

function MemberBlock({
    index,
    member,
    onUpdate,
    onKpiUpdate,
    onCompUpdate,
}: {
    index: number
    member: MemberReview
    onUpdate: (patch: Partial<MemberReview>) => void
    onKpiUpdate: (kpiIdx: number, field: keyof KpiRow, value: string) => void
    onCompUpdate: (compIdx: number, field: "rating" | "notes", value: number | string) => void
}) {
    return (
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
            {/* ── Header ── */}
            <div className="bg-accent/10 border-b border-border px-5 py-3">
                <h3 className="text-sm font-bold text-accent uppercase tracking-wide">
                    MEMBER {index + 1}
                    <span className="ml-2 text-text-2 normal-case font-normal italic text-xs">
                        — Individual Performance Summary
                    </span>
                </h3>
            </div>

            <div className="p-5 space-y-5">
                {/* ── Info Row ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-text-2 w-28 shrink-0">Member Name:</label>
                        <Input
                            value={member.name}
                            onChange={(e) => onUpdate({ name: e.target.value })}
                            className="text-sm h-8"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-text-2 w-24 shrink-0">Role / Level:</label>
                        <Input
                            value={member.role}
                            onChange={(e) => onUpdate({ role: e.target.value })}
                            className="text-sm h-8"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-text-2 w-28 shrink-0">Tenure on Team:</label>
                        <Input
                            value={member.tenure}
                            onChange={(e) => onUpdate({ tenure: e.target.value })}
                            className="text-sm h-8"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-text-2 w-24 shrink-0">Reqs Assigned:</label>
                        <Input
                            value={member.reqsAssigned}
                            onChange={(e) => onUpdate({ reqsAssigned: e.target.value })}
                            placeholder="(Month)"
                            className="text-sm h-8"
                        />
                    </div>
                </div>

                {/* ── KPI Table ── */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-accent/15 text-accent font-semibold">
                                <th className="text-left px-3 py-2 w-[180px]">KPI</th>
                                <th className="text-center px-2 py-2 w-[80px]">Target</th>
                                <th className="text-center px-2 py-2 w-[80px]">Actual</th>
                                <th className="text-center px-2 py-2 w-[80px]">% Achvmt</th>
                                <th className="text-center px-2 py-2 w-[80px]">TTF (days)</th>
                                <th className="text-center px-2 py-2 w-[80px]">OAR %</th>
                                <th className="text-center px-2 py-2 w-[80px]">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {member.kpis.map((kpi, kIdx) => (
                                <tr key={kIdx} className="border-t border-border hover:bg-bg-2/50 transition-colors">
                                    <td className="px-3 py-1.5 font-medium text-text-2">{kpi.name}</td>
                                    <td className="px-1 py-1">
                                        <Input value={kpi.target} onChange={(e) => onKpiUpdate(kIdx, "target", e.target.value)} className="text-xs h-7 text-center" />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input value={kpi.actual} onChange={(e) => onKpiUpdate(kIdx, "actual", e.target.value)} className="text-xs h-7 text-center" />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input value={kpi.achvmt} onChange={(e) => onKpiUpdate(kIdx, "achvmt", e.target.value)} className="text-xs h-7 text-center" />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input value={kpi.ttf} onChange={(e) => onKpiUpdate(kIdx, "ttf", e.target.value)} className="text-xs h-7 text-center" />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input value={kpi.oar} onChange={(e) => onKpiUpdate(kIdx, "oar", e.target.value)} className="text-xs h-7 text-center" />
                                    </td>
                                    <td className="px-1 py-1">
                                        <Input value={kpi.trend} onChange={(e) => onKpiUpdate(kIdx, "trend", e.target.value)} className="text-xs h-7 text-center" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Competency Table ── */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-accent/15 text-accent font-semibold">
                                <th className="text-left px-3 py-2 w-[200px]">Competency</th>
                                <th className="text-center px-2 py-2 w-10">1</th>
                                <th className="text-center px-2 py-2 w-10">2</th>
                                <th className="text-center px-2 py-2 w-10">3</th>
                                <th className="text-center px-2 py-2 w-10">4</th>
                                <th className="text-center px-2 py-2 w-10">5</th>
                                <th className="text-left px-3 py-2">Manager Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {member.competencies.map((comp, cIdx) => (
                                <tr key={cIdx} className="border-t border-border hover:bg-bg-2/50 transition-colors">
                                    <td className="px-3 py-1.5 font-medium text-text-2">{comp.name}</td>
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <td key={v} className="text-center px-1 py-1">
                                            <button
                                                type="button"
                                                onClick={() => onCompUpdate(cIdx, "rating", comp.rating === v ? 0 : v)}
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
                                        <Input
                                            value={comp.notes}
                                            onChange={(e) => onCompUpdate(cIdx, "notes", e.target.value)}
                                            placeholder="Notes..."
                                            className="text-xs h-7"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Strengths / Gaps / Action Plan ── */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="grid grid-cols-3 divide-x divide-border">
                        <div>
                            <div className="bg-amber-600/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-bold border-b border-border">
                                Key Strengths This Month:
                            </div>
                            <div className="p-2">
                                <Textarea
                                    value={member.strengths}
                                    onChange={(e) => onUpdate({ strengths: e.target.value })}
                                    rows={3}
                                    className="text-xs resize-none border-0 focus:ring-0 p-1"
                                    placeholder="Enter key strengths..."
                                />
                            </div>
                        </div>
                        <div>
                            <div className="bg-amber-600/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-bold border-b border-border">
                                Development Gaps:
                            </div>
                            <div className="p-2">
                                <Textarea
                                    value={member.gaps}
                                    onChange={(e) => onUpdate({ gaps: e.target.value })}
                                    rows={3}
                                    className="text-xs resize-none border-0 focus:ring-0 p-1"
                                    placeholder="Enter development gaps..."
                                />
                            </div>
                        </div>
                        <div>
                            <div className="bg-amber-600/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-bold border-b border-border">
                                Action Plan / Support Needed:
                            </div>
                            <div className="p-2">
                                <Textarea
                                    value={member.actionPlan}
                                    onChange={(e) => onUpdate({ actionPlan: e.target.value })}
                                    rows={3}
                                    className="text-xs resize-none border-0 focus:ring-0 p-1"
                                    placeholder="Enter action plan..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Overall Rating ── */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr>
                                <th className="text-left px-3 py-2 bg-bg-2 font-bold text-text-2 w-[140px]">Overall Member Rating:</th>
                                {RATING_LABELS.map(r => (
                                    <th key={r.value} className={cn(
                                        "text-center px-2 py-2 font-semibold text-[10px]",
                                        r.value <= 2 ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                                        r.value === 3 ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                                        "bg-blue-500/25 text-blue-700 dark:text-blue-300"
                                    )}>
                                        {r.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-border">
                                <td className="px-3 py-2.5"></td>
                                {RATING_LABELS.map(r => (
                                    <td key={r.value} className="text-center px-2 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => onUpdate({ overallRating: member.overallRating === r.value ? 0 : r.value })}
                                            className={cn(
                                                "w-7 h-7 rounded-full border-2 transition-all text-xs font-bold",
                                                member.overallRating === r.value
                                                    ? "border-accent bg-accent text-white scale-110 shadow-md"
                                                    : "border-border text-text-3 hover:border-accent/50"
                                            )}
                                        >
                                            {member.overallRating === r.value ? "●" : "○"}
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CONFIG EDITOR — KPIs & Competencies
   ═══════════════════════════════════════════════════════════════ */

function ConfigEditor({
    config,
    onSave,
    onClose,
}: {
    config: TeamReviewConfig
    onSave: (c: TeamReviewConfig) => void
    onClose: () => void
}) {
    const [draft, setDraft] = React.useState<TeamReviewConfig>({
        kpiNames: [...config.kpiNames],
        competencyNames: [...config.competencyNames],
    })

    function addKpi() {
        setDraft(d => ({ ...d, kpiNames: [...d.kpiNames, ""] }))
    }
    function removeKpi(idx: number) {
        setDraft(d => ({ ...d, kpiNames: d.kpiNames.filter((_, i) => i !== idx) }))
    }
    function updateKpi(idx: number, val: string) {
        setDraft(d => ({ ...d, kpiNames: d.kpiNames.map((k, i) => i === idx ? val : k) }))
    }
    function addComp() {
        setDraft(d => ({ ...d, competencyNames: [...d.competencyNames, ""] }))
    }
    function removeComp(idx: number) {
        setDraft(d => ({ ...d, competencyNames: d.competencyNames.filter((_, i) => i !== idx) }))
    }
    function updateComp(idx: number, val: string) {
        setDraft(d => ({ ...d, competencyNames: d.competencyNames.map((c, i) => i === idx ? val : c) }))
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="sticky top-0 bg-surface border-b border-border px-5 py-3 flex items-center justify-between z-10">
                    <h3 className="text-sm font-bold text-text">Configure Review Template</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-bg-2 text-text-3">
                        <Cross2Icon className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-5">
                    {/* KPIs */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-text-2 uppercase tracking-wide">KPI Rows</label>
                            <button onClick={addKpi} className="text-[10px] text-accent flex items-center gap-0.5 hover:underline">
                                <PlusIcon className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {draft.kpiNames.map((k, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Input
                                        value={k}
                                        onChange={(e) => updateKpi(i, e.target.value)}
                                        className="text-xs h-8 flex-1"
                                        placeholder="KPI name..."
                                    />
                                    <button onClick={() => removeKpi(i)} className="text-red-400 hover:text-red-600 p-1">
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Competencies */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-text-2 uppercase tracking-wide">Competency Rows</label>
                            <button onClick={addComp} className="text-[10px] text-accent flex items-center gap-0.5 hover:underline">
                                <PlusIcon className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {draft.competencyNames.map((c, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Input
                                        value={c}
                                        onChange={(e) => updateComp(i, e.target.value)}
                                        className="text-xs h-8 flex-1"
                                        placeholder="Competency name..."
                                    />
                                    <button onClick={() => removeComp(i)} className="text-red-400 hover:text-red-600 p-1">
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="border-t border-border px-5 py-3 flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSave(draft)}>Save Template</Button>
                </div>
            </div>
        </div>
    )
}
