"use client"

import * as React from "react"
import { extractArray } from "@/lib/utils"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import { StatCard } from "@/components/ui/StatCard"
import { EmptyState } from "@/components/ui/EmptyState"
import { DailyReviewForm } from "./DailyReviewForm"
import { MonthlyReviewForm } from "./MonthlyReviewForm"
import { SelfReviewForm } from "./SelfReviewForm"
import { DailySelfReviewForm } from "./DailySelfReviewForm"
import { ReviewDetailView } from "./ReviewDetailView"
import { TeamReviewForm } from "./TeamReviewForm"
import { LeaderMonthlySelfReview } from "./LeaderMonthlySelfReview"
import { AppraisalForm } from "./AppraisalForm"
import { PerformanceTemplateEditor } from "./PerformanceTemplateEditor"
import { GearIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { MagnifyingGlassIcon, FileTextIcon, PlusIcon, PersonIcon, ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons"
import { PerformanceAPI } from "@/features/performance/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"
import { TeamAPI } from "@/features/teams/api/client"
import { api } from "@/lib/api-client"

type Employee = {
    id: string
    firstName: string
    lastName: string
    designation?: string
    avatarUrl?: string | null
    department?: { name: string }
}

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
    reviewType?: string
    employeeId: string
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

/** Normalize Django PerformanceReview response to the frontend shape */
function normalizeReview(raw: any): PerformanceReview {
    // Build employee nested object from UUID + employeeName
    const empIsObject = raw.employee && typeof raw.employee === "object"
    const empNameStr: string = raw.employeeName || ""
    const [empFn = "", ...empLn] = empNameStr.split(/\s+/)
    const employee = empIsObject ? raw.employee : {
        id: raw.employee || raw.employeeId || raw.id,
        firstName: empFn,
        lastName: empLn.join(" "),
        designation: raw.designation || "",
        department: raw.department || undefined,
    }

    // Build reviewer nested object
    const revIsObject = raw.reviewer && typeof raw.reviewer === "object"
    const revNameStr: string = raw.reviewerName || ""
    const [revFn = "", ...revLn] = revNameStr.split(/\s+/)
    const reviewer = raw.reviewer
        ? (revIsObject ? raw.reviewer : { id: raw.reviewer, firstName: revFn, lastName: revLn.join(" ") })
        : null

    return {
        ...raw,
        employee,
        employeeId: employee.id,
        reviewer,
        rating: Number(raw.rating ?? raw.overallScore ?? 0),
        reviewDate: raw.reviewDate || raw.createdAt || "",
        reviewPeriod: raw.reviewPeriod || raw.period || null,
        formType: raw.formType || null,
        formData: raw.formData || null,
        reviewType: raw.reviewType || undefined,
        progress: Number(raw.progress ?? 0),
        comments: raw.comments || raw.strengths || null,
        status: raw.status || "",
    } as PerformanceReview
}

function getStatusBadge(status: string) {
    switch (status) {
        case "EXCELLENT": return <Badge variant="success">{status}</Badge>
        case "GOOD": return <Badge variant="default">{status}</Badge>
        case "NEEDS_IMPROVEMENT": return <Badge variant="warning">NEEDS IMPROVEMENT</Badge>
        case "COMPLETED": return <Badge variant="neutral">{status}</Badge>
        case "PENDING": return null
        default: return <Badge variant="neutral">{status}</Badge>
    }
}

export function AdminPerformanceView() {
    const { user } = useAuth()
    const isCeoOrHr = user?.role === "CEO" || user?.role === "HR"
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [teams, setTeams] = React.useState<{ id: string; name: string; leadId?: string; memberIds: string[] }[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [dailyOpen, setDailyOpen] = React.useState(false)
    const [monthlyOpen, setMonthlyOpen] = React.useState(false)
    const [selfReviewOpen, setSelfReviewOpen] = React.useState(false)
    const [dailySelfOpen, setDailySelfOpen] = React.useState(false)
    const [viewReview, setViewReview] = React.useState<PerformanceReview | null>(null)
    const [teamReviewPage, setTeamReviewPage] = React.useState(false)
    const [teamReviewFormOpen, setTeamReviewFormOpen] = React.useState(false)

    // Team report view state
    const [teamReportOpen, setTeamReportOpen] = React.useState<{ id: string; name: string } | null>(null)
    const [teamReportSelectedReview, setTeamReportSelectedReview] = React.useState<PerformanceReview | null>(null)

    // Source One top-level tab
    const [topTab, setTopTab] = React.useState<"reviews" | "monthly" | "appraisals" | "cycles" | "pips">("reviews")
    const [monthlyReviews, setMonthlyReviews] = React.useState<any[]>([])
    const [appraisals, setAppraisals] = React.useState<any[]>([])
    const [cycles, setCycles] = React.useState<any[]>([])
    const [pips, setPips] = React.useState<any[]>([])
    const [sourceOneLoading, setSourceOneLoading] = React.useState(false)
    const [monthlyFormOpen, setMonthlyFormOpen] = React.useState(false)
    const [appraisalFormOpen, setAppraisalFormOpen] = React.useState<"ANNUAL" | "SIX_MONTHLY" | null>(null)

    // Performance template config (initialized with defaults so editor always works)
    const [perfTemplate, setPerfTemplate] = React.useState({
        dailyMetrics: [
            "Tasks Completed", "Meetings Attended", "Emails/Communications",
            "Reports Prepared", "Client Interactions", "Issues Resolved",
            "Training Hours", "Collaboration Activities",
        ],
        dailyCompetencies: [
            "Communication Quality", "Responsiveness & Follow-Through",
            "Team Collaboration", "Attention to Detail",
            "Problem Solving", "Process Adherence",
        ],
        monthlyKpis: [
            "Projects/Tasks Completed", "Deadlines Met", "Quality Score",
            "Client/Stakeholder Satisfaction", "Revenue/Cost Impact",
            "Training Completed", "Attendance Rate", "Team Contribution",
            "Documentation Delivered", "Innovation Initiatives",
        ],
        monthlyCompetencies: [
            "Technical Proficiency", "Communication & Collaboration",
            "Leadership & Initiative", "Problem Solving", "Time Management",
            "Customer Focus", "Adaptability & Learning", "Quality & Detail",
            "Process Compliance", "Continuous Improvement",
        ],
        selfCompetencies: [
            "Technical Proficiency", "Communication & Collaboration",
            "Leadership & Initiative", "Problem Solving", "Time Management",
            "Customer Focus", "Adaptability & Learning", "Quality & Detail",
            "Process Compliance", "Continuous Improvement",
        ],
    })
    // Template editor (hidden for now — can be re-enabled later)
    // const [templateEditorOpen, setTemplateEditorOpen] = React.useState(false)

    // Mode toggle: "team" or "self"
    const [mode, setMode] = React.useState<"team" | "self">("team")

    // Master-detail state (team mode)
    const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)
    const [empSearch, setEmpSearch] = React.useState("")

    // CEO/HR filter mode: "individual" or "team-wise"
    const [filterMode, setFilterMode] = React.useState<"individual" | "team-wise">("individual")

    // Resolve the logged-in user's employee ID
    const [selfEmployeeId, setSelfEmployeeId] = React.useState<string | null>(null)

    const fetchAll = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const role = user?.role

            const revPromise = PerformanceAPI.listReviews()

            let empPromise: Promise<any[]>
            if (role === "TEAM_LEAD") {
                // Resolve this user's employee ID first, then find their team
                empPromise = (async () => {
                    // Get the logged-in user's employee ID
                    let myEmployeeId: string | null = selfEmployeeId
                    if (!myEmployeeId) {
                        try {
                            const { data: profileData } = await api.get<any>('/employees/profile/')
                            const pData = profileData
                            myEmployeeId = pData?.employeeId || pData?.id || null
                            if (myEmployeeId) setSelfEmployeeId(myEmployeeId)
                        } catch { /* ignore */ }
                    }

                    try {
                        const teamsData = await TeamAPI.list()
                        const allTeams = extractArray<any>(teamsData.results || teamsData)

                        // Find the team where this user is the lead
                        const myTeam = allTeams.find((t: any) => {
                            const leadId = typeof t.lead === "object" ? t.lead?.id : (t.leadId || t.lead || "")
                            return leadId === myEmployeeId
                        })
                        if (myTeam) {
                            // Fetch team detail which includes members
                            const teamDetail = await TeamAPI.get(myTeam.id)
                            return extractArray<any>(teamDetail.members || [])
                        }
                    } catch { /* ignore */ }
                    return []
                })()
            } else {
                empPromise = EmployeeAPI.fetchEmployees(1, 200).then(data => {
                    return data.results || []
                }).catch(() => [])
            }

            const [revResult, empArr] = await Promise.all([revPromise.catch(() => null), empPromise])

            let fetchedReviews: PerformanceReview[] = []
            if (revResult) {
                fetchedReviews = extractArray<any>(revResult.results || revResult).map(normalizeReview)
                setReviews(fetchedReviews)
            }

            let mapped: Employee[] = []
            if (empArr && empArr.length > 0) {
                mapped = empArr.map((e: any) => {
                    if (e.employee) {
                        return {
                            id: e.employee.id,
                            firstName: e.employee.firstName,
                            lastName: e.employee.lastName,
                            designation: e.employee.designation,
                            avatarUrl: e.employee.avatarUrl,
                            department: e.employee.department,
                        }
                    }
                    return e
                })
            }

            // Fallback: if no employees from teams, extract unique employees from reviews
            if (mapped.length === 0 && fetchedReviews.length > 0) {
                const seen = new Set<string>()
                for (const r of fetchedReviews) {
                    if (r.employee && !seen.has(r.employee.id)) {
                        seen.add(r.employee.id)
                        mapped.push({
                            id: r.employee.id,
                            firstName: r.employee.firstName,
                            lastName: r.employee.lastName,
                            designation: r.employee.designation,
                            department: r.employee.department,
                        })
                    }
                }
            }

            setEmployees(mapped)

            // Fetch teams for CEO/HR team-wise grouping
            if (role === "CEO" || role === "HR") {
                try {
                    const teamsData = await TeamAPI.list()
                    const teamsArr = extractArray<any>(teamsData.results || teamsData)
                    setTeams(teamsArr.map((t: any) => {
                        // memberIds comes from Django's member_ids field (list of employee UUIDs)
                        const ids: string[] = Array.isArray(t.memberIds) ? [...t.memberIds] : []
                        // Fallback: extract from members array if present (detail endpoint)
                        if (ids.length === 0 && Array.isArray(t.members)) {
                            for (const m of t.members) {
                                const eid = typeof m.employee === "object" ? m.employee?.id : m.employee || m.employeeId
                                if (eid && !ids.includes(eid)) ids.push(eid)
                            }
                        }
                        // Ensure lead is included
                        const leadId = typeof t.lead === "object" ? t.lead?.id : (t.leadId || t.lead || "")
                        if (leadId && !ids.includes(leadId)) ids.push(leadId)
                        return { id: t.id, name: t.name, leadId, memberIds: ids }
                    }))
                } catch { /* non-critical */ }
            }
        } catch (_error) {
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [user?.role])

    // Resolve self employee ID from profile API
    const resolveSelfEmployeeId = React.useCallback(async (): Promise<string | null> => {
        if (selfEmployeeId) return selfEmployeeId
        try {
            const { data } = await api.get<any>('/employees/profile/')
            // flattenEmployee() can overwrite `id` with sub-model ids,
            // so prefer `employeeId` (from EmployeeProfile/Address/Banking) first
            const empId = data?.employeeId || data?.id
            if (empId) {
                setSelfEmployeeId(empId)
                return empId
            }
        } catch { /* non-critical */ }
        return null
    }, [selfEmployeeId])

    // Fetch performance template on mount
    const fetchTemplate = React.useCallback(async () => {
        try {
            const { data } = await api.get<any>('/performance/templates/')
            setPerfTemplate(data)
        } catch { /* non-critical -- forms fall back to hardcoded defaults */ }
    }, [])

    // Eagerly resolve on mount
    React.useEffect(() => { resolveSelfEmployeeId() }, [resolveSelfEmployeeId])

    React.useEffect(() => { fetchAll() }, [fetchAll])

    React.useEffect(() => { fetchTemplate() }, [fetchTemplate])

    // Source One data fetch
    const fetchSourceOne = React.useCallback(async () => {
        setSourceOneLoading(true)
        try {
            const [mr, ap, cy, pi] = await Promise.all([
                PerformanceAPI.listMonthlyReviews().catch(() => ({ results: [] })),
                PerformanceAPI.listAppraisals().catch(() => ({ results: [] })),
                PerformanceAPI.listCycles().catch(() => ({ results: [] })),
                PerformanceAPI.listPIPs().catch(() => ({ results: [] })),
            ])
            setMonthlyReviews(extractArray(mr.results || mr))
            setAppraisals(extractArray(ap.results || ap))
            setCycles(extractArray(cy.results || cy))
            setPips(extractArray(pi.results || pi))
        } finally {
            setSourceOneLoading(false)
        }
    }, [])

    React.useEffect(() => {
        if (topTab !== "reviews") fetchSourceOne()
    }, [topTab, fetchSourceOne])

    // Open self review dialogs — resolves employee ID on-demand if needed
    const handleOpenSelfReview = async (type: "daily" | "monthly") => {
        const empId = await resolveSelfEmployeeId()
        if (empId) {
            if (type === "daily") setDailySelfOpen(true)
            else setSelfReviewOpen(true)
        } else {
            toast.error("Could not find your employee profile. Please contact your admin.")
        }
    }

    const handleSubmitReview = async (data: any) => {
        try {
            await PerformanceAPI.createReview(data)
            toast.success("Review submitted successfully")
            setDailyOpen(false)
            setMonthlyOpen(false)
            setSelfReviewOpen(false)
            setDailySelfOpen(false)
            fetchAll()
        } catch (err: any) {
            console.error("[REVIEW_SUBMIT]", err)
            toast.error(err?.message || "Failed to submit review")
        }
    }

    // Set of employee IDs that are team leads
    const teamLeadIds = React.useMemo(() => {
        const ids = new Set<string>()
        teams.forEach(t => { if (t.leadId) ids.add(t.leadId) })
        return ids
    }, [teams])

    // Filter employees by search (team mode)
    const filteredEmployees = React.useMemo(() => {
        if (!empSearch.trim()) return employees
        const q = empSearch.toLowerCase()
        return employees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            (e.designation || "").toLowerCase().includes(q) ||
            (e.department?.name || "").toLowerCase().includes(q)
        )
    }, [employees, empSearch])

    // Reviews for selected employee (team mode)
    const selectedReviews = React.useMemo(() => {
        if (!selectedEmployeeId) return []
        return reviews.filter(r => r.employeeId === selectedEmployeeId)
    }, [reviews, selectedEmployeeId])

    const selectedEmployee = React.useMemo(() => {
        return employees.find(e => e.id === selectedEmployeeId) || null
    }, [employees, selectedEmployeeId])

    // Self reviews (self mode) — reviews where the TL reviewed themselves
    const selfReviews = React.useMemo(() => {
        if (!selfEmployeeId) return []
        return reviews.filter(r => r.employeeId === selfEmployeeId && r.reviewType === "SELF")
    }, [reviews, selfEmployeeId])

    const selfAvgRating = React.useMemo(() => {
        if (selfReviews.length === 0) return 0
        return selfReviews.reduce((sum, r) => sum + r.rating, 0) / selfReviews.length
    }, [selfReviews])

    const latestSelfReview = selfReviews[0] || null

    // Employee avg ratings for badges in the left list
    const employeeAvgRatings = React.useMemo(() => {
        const map = new Map<string, { avg: number; count: number; latest: string }>()
        for (const emp of employees) {
            const empReviews = reviews.filter(r => r.employeeId === emp.id)
            if (empReviews.length > 0) {
                const avg = empReviews.reduce((s, r) => s + r.rating, 0) / empReviews.length
                const latest = empReviews[0]?.reviewDate || ""
                map.set(emp.id, { avg, count: empReviews.length, latest })
            }
        }
        return map
    }, [employees, reviews])

    // Team-grouped employees for team-wise mode (groups by team name from Teams module)
    const teamGroups = React.useMemo(() => {
        const groups = new Map<string, Employee[]>()
        const assigned = new Set<string>()
        for (const team of teams) {
            const members = filteredEmployees.filter(e => team.memberIds.includes(e.id))
            if (members.length > 0) {
                groups.set(team.name, members)
                members.forEach(m => assigned.add(m.id))
            }
        }
        // Employees not in any team
        const unassigned = filteredEmployees.filter(e => !assigned.has(e.id))
        if (unassigned.length > 0) {
            groups.set("Unassigned", unassigned)
        }
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
    }, [filteredEmployees, teams])

    // Collapsed departments state for team-wise
    const [collapsedDepts, setCollapsedDepts] = React.useState<Set<string>>(new Set())
    const toggleDept = (dept: string) => {
        setCollapsedDepts(prev => {
            const next = new Set(prev)
            next.has(dept) ? next.delete(dept) : next.add(dept)
            return next
        })
    }

    // Review type filter for the right panel
    const [reviewTypeFilter, setReviewTypeFilter] = React.useState<"ALL" | "DAILY" | "MONTHLY" | "SELF">("ALL")
    const filteredSelectedReviews = React.useMemo(() => {
        if (reviewTypeFilter === "ALL") return selectedReviews
        if (reviewTypeFilter === "SELF") return selectedReviews.filter(r => r.reviewType === "SELF")
        return selectedReviews.filter(r => r.formType === reviewTypeFilter)
    }, [selectedReviews, reviewTypeFilter])

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title={isCeoOrHr ? "Performance Overview" : "Performance Management"}
                description={
                    isCeoOrHr
                        ? "View all employee performance reviews across the organization"
                        : "Manage your team's performance reviews"
                }
                actions={
                    !isCeoOrHr ? (
                        <div className="flex gap-2">
                            <Button
                                variant={mode === "team" ? "primary" : "secondary"}
                                onClick={() => setMode("team")}
                            >
                                Review team
                            </Button>
                            <Button
                                variant={mode === "self" ? "primary" : "secondary"}
                                onClick={() => setMode("self")}
                            >
                                Self Review
                            </Button>
                        </div>
                    ) : undefined
                }
            />

            {/* ═══════════ TOP-LEVEL TAB BAR ═══════════ */}
            <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
                {(["reviews", "monthly", "appraisals", "cycles", "pips"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setTopTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                            topTab === tab ? "bg-accent text-white shadow-sm" : "text-text-3 hover:text-text hover:bg-bg-2"
                        )}
                    >
                        {tab === "reviews" ? "Reviews" : tab === "monthly" ? "Monthly Reviews" : tab === "appraisals" ? "Appraisals" : tab === "cycles" ? "Review Cycles" : "PIPs"}
                    </button>
                ))}
            </div>

            {/* ═══════════ SOURCE ONE: MONTHLY REVIEWS ═══════════ */}
            {topTab === "monthly" && (
                <Card>
                    <CardHeader className="border-b border-border flex-row items-center justify-between">
                        <CardTitle className="text-base">Monthly Reviews (Source One)</CardTitle>
                        <Button size="sm" variant="primary" onClick={() => setMonthlyFormOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                            Create Monthly Review
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sourceOneLoading ? (
                            <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
                        ) : monthlyReviews.length === 0 ? (
                            <EmptyState title="No monthly reviews" description="No Source One monthly reviews found." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2/50 text-text-3 text-xs">
                                            <th className="text-left px-4 py-2.5 font-medium">Employee</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Month / Year</th>
                                            <th className="text-center px-4 py-2.5 font-medium">Rating</th>
                                            <th className="text-center px-4 py-2.5 font-medium">Score %</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {monthlyReviews.map((mr: any) => (
                                            <tr key={mr.id} className="hover:bg-bg-2/30 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-text">{mr.employeeName || "—"}</td>
                                                <td className="px-4 py-2.5 text-text-2">{mr.reviewMonth}/{mr.reviewYear}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {mr.rating != null ? (
                                                        <span className="font-semibold">{mr.rating}/5</span>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-text-2">{mr.scorePercentage != null ? `${mr.scorePercentage}%` : "—"}</td>
                                                <td className="px-4 py-2.5">
                                                    <Badge variant={mr.status === "COMPLETED" ? "success" : mr.status === "DRAFT" ? "neutral" : "default"} size="sm">
                                                        {mr.statusDisplay || mr.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5 text-text-3 text-xs">{mr.createdAt ? format(new Date(mr.createdAt), "MMM d, yyyy") : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ SOURCE ONE: APPRAISALS ═══════════ */}
            {topTab === "appraisals" && (
                <Card>
                    <CardHeader className="border-b border-border flex-row items-center justify-between">
                        <CardTitle className="text-base">Appraisals (Source One)</CardTitle>
                        <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => setAppraisalFormOpen("ANNUAL")} leftIcon={<PlusIcon className="w-4 h-4" />}>
                                Annual Appraisal
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setAppraisalFormOpen("SIX_MONTHLY")} leftIcon={<PlusIcon className="w-4 h-4" />}>
                                Six-Monthly Appraisal
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sourceOneLoading ? (
                            <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
                        ) : appraisals.length === 0 ? (
                            <EmptyState title="No appraisals" description="No Source One appraisals found." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2/50 text-text-3 text-xs">
                                            <th className="text-left px-4 py-2.5 font-medium">Employee</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Type</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Period</th>
                                            <th className="text-center px-4 py-2.5 font-medium">Rating</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {appraisals.map((ap: any) => (
                                            <tr key={ap.id} className="hover:bg-bg-2/30 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-text">{ap.employeeName || "—"}</td>
                                                <td className="px-4 py-2.5 text-text-2">{ap.reviewTypeDisplay || ap.reviewType}</td>
                                                <td className="px-4 py-2.5 text-text-2">{ap.reviewPeriod || ap.financialYear || "—"}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {ap.overallRating != null ? (
                                                        <span className="font-semibold">{ap.overallRating}/5</span>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <Badge variant={ap.status === "COMPLETED" ? "success" : ap.status === "DRAFT" ? "neutral" : "default"} size="sm">
                                                        {ap.statusDisplay || ap.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5 text-text-3 text-xs">{ap.createdAt ? format(new Date(ap.createdAt), "MMM d, yyyy") : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ SOURCE ONE: REVIEW CYCLES ═══════════ */}
            {topTab === "cycles" && (
                <Card>
                    <CardHeader className="border-b border-border flex-row items-center justify-between">
                        <CardTitle className="text-base">Review Cycles</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sourceOneLoading ? (
                            <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
                        ) : cycles.length === 0 ? (
                            <EmptyState title="No review cycles" description="No review cycles found." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2/50 text-text-3 text-xs">
                                            <th className="text-left px-4 py-2.5 font-medium">Type</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Period Label</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Start - End</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Financial Year</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {cycles.map((cy: any) => (
                                            <tr key={cy.id} className="hover:bg-bg-2/30 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-text">{cy.cycleTypeDisplay || cy.cycleType}</td>
                                                <td className="px-4 py-2.5 text-text-2">{cy.periodLabel || "—"}</td>
                                                <td className="px-4 py-2.5 text-text-2">
                                                    {cy.periodStart ? format(new Date(cy.periodStart), "MMM d, yyyy") : "—"}
                                                    {" - "}
                                                    {cy.periodEnd ? format(new Date(cy.periodEnd), "MMM d, yyyy") : "—"}
                                                </td>
                                                <td className="px-4 py-2.5 text-text-2">{cy.financialYear || "—"}</td>
                                                <td className="px-4 py-2.5">
                                                    <Badge variant={cy.status === "COMPLETED" ? "success" : cy.status === "ACTIVE" ? "default" : "neutral"} size="sm">
                                                        {cy.statusDisplay || cy.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ SOURCE ONE: PIPs ═══════════ */}
            {topTab === "pips" && (
                <Card>
                    <CardHeader className="border-b border-border flex-row items-center justify-between">
                        <CardTitle className="text-base">Performance Improvement Plans</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sourceOneLoading ? (
                            <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
                        ) : pips.length === 0 ? (
                            <EmptyState title="No PIPs" description="No performance improvement plans found." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2/50 text-text-3 text-xs">
                                            <th className="text-left px-4 py-2.5 font-medium">Employee</th>
                                            <th className="text-left px-4 py-2.5 font-medium">PIP Type</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Start - End</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {pips.map((pip: any) => (
                                            <tr key={pip.id} className="hover:bg-bg-2/30 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-text">{pip.employeeName || "—"}</td>
                                                <td className="px-4 py-2.5 text-text-2">{pip.pipTypeDisplay || pip.pipType}</td>
                                                <td className="px-4 py-2.5 text-text-2">
                                                    {pip.startDate ? format(new Date(pip.startDate), "MMM d, yyyy") : "—"}
                                                    {" - "}
                                                    {pip.endDate ? format(new Date(pip.endDate), "MMM d, yyyy") : "—"}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <Badge variant={pip.status === "COMPLETED" ? "success" : pip.status === "ACTIVE" ? "warning" : "neutral"} size="sm">
                                                        {pip.statusDisplay || pip.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5 text-text-2">{pip.outcome || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ SOURCE ONE DIALOGS ═══════════ */}

            {/* Monthly Review Form Dialog (Source One) */}
            <Dialog open={monthlyFormOpen} onClose={() => setMonthlyFormOpen(false)} size="full">
                <DialogHeader>
                    <DialogTitle>Create Monthly Review (Source One)</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <MonthlyReviewForm
                        employees={employees}
                        onSubmit={async (data: any) => {
                            try {
                                await PerformanceAPI.createMonthlyReview(data)
                                toast.success("Monthly review created")
                                setMonthlyFormOpen(false)
                                fetchSourceOne()
                            } catch (err: any) {
                                toast.error(err?.message || "Failed to create monthly review")
                            }
                        }}
                        onCancel={() => setMonthlyFormOpen(false)}
                        isHR={user?.role === "HR"}
                        isTeamLead={user?.role === "TEAM_LEAD"}
                    />
                </DialogBody>
            </Dialog>

            {/* Appraisal Form Dialog (Source One) */}
            <Dialog open={!!appraisalFormOpen} onClose={() => setAppraisalFormOpen(null)} size="full">
                <DialogHeader>
                    <DialogTitle>Create {appraisalFormOpen === "SIX_MONTHLY" ? "Six-Monthly" : "Annual"} Appraisal</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {appraisalFormOpen && (
                        <AppraisalForm
                            employees={employees}
                            reviewType={appraisalFormOpen}
                            onSubmit={async (data: any) => {
                                try {
                                    await PerformanceAPI.createAppraisal(data)
                                    toast.success("Appraisal created")
                                    setAppraisalFormOpen(null)
                                    fetchSourceOne()
                                } catch (err: any) {
                                    toast.error(err?.message || "Failed to create appraisal")
                                }
                            }}
                            onCancel={() => setAppraisalFormOpen(null)}
                            isHR={user?.role === "HR"}
                            isManager={user?.role === "TEAM_LEAD" || user?.role === "CEO"}
                        />
                    )}
                </DialogBody>
            </Dialog>

            {topTab === "reviews" && (<>
            {/* ═══════════ TEAM REVIEW PAGE ═══════════ */}
            {teamReviewPage && (() => {
                const teamReviews = reviews.filter(r => r.formType === "TEAM_REVIEW")
                return (
                    <div className="bg-surface border border-border rounded-xl min-h-[calc(100vh-220px)] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <div className="flex items-center">
                                <button
                                    onClick={() => setTeamReviewPage(false)}
                                    className="text-sm text-accent hover:underline flex items-center gap-1"
                                >
                                    <ChevronRightIcon className="w-4 h-4 rotate-180" />
                                    Back
                                </button>
                                <h2 className="text-lg font-semibold text-text ml-4">Team Review</h2>
                                {teamReviews.length > 0 && (
                                    <Badge variant="neutral" size="sm" className="ml-2">{teamReviews.length}</Badge>
                                )}
                            </div>
                            <Button variant="primary" size="sm" onClick={() => setTeamReviewFormOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                                Put Review
                            </Button>
                        </div>

                        {teamReviews.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                                <EmptyState
                                    icon={<FileTextIcon className="w-10 h-10" />}
                                    title="No Team Reviews Yet"
                                    description="Submit a team review to see it listed here."
                                />
                                <Button variant="primary" onClick={() => setTeamReviewFormOpen(true)}>
                                    Put Review
                                </Button>
                            </div>
                        ) : (
                            <div className="p-5 space-y-3 overflow-y-auto flex-1">
                                {teamReviews.map(rev => (
                                    <button
                                        key={rev.id}
                                        onClick={() => setViewReview(rev)}
                                        className="w-full text-left p-4 bg-bg-2/50 hover:bg-accent/[0.04] border border-border/60 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    name={`${rev.employee.firstName} ${rev.employee.lastName}`}
                                                    size="xs"
                                                />
                                                <span className="text-sm font-semibold text-text">
                                                    {rev.employee.firstName} {rev.employee.lastName}
                                                </span>
                                                {rev.employee.designation && (
                                                    <span className="text-xs text-text-4">{rev.employee.designation}</span>
                                                )}
                                            </div>
                                            {getStatusBadge(rev.status)}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-warning tracking-wider text-sm">{"★".repeat(Math.floor(rev.rating))}</span>
                                                    <span className="text-text-4 tracking-wider text-sm">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                                    <span className="text-xs text-text-3 font-mono ml-1">{rev.rating.toFixed(1)}</span>
                                                </div>
                                                <div className="text-xs text-text-3">
                                                    {format(new Date(rev.reviewDate), "MMM d, yyyy")}
                                                    {rev.reviewPeriod && <span className="ml-2 text-text-4">{rev.reviewPeriod}</span>}
                                                    {rev.reviewer && (
                                                        <span className="ml-2">by {rev.reviewer.firstName} {rev.reviewer.lastName}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                                View Details &rarr;
                                            </span>
                                        </div>
                                        {rev.comments && (
                                            <p className="text-xs text-text-3 mt-2 line-clamp-2">{rev.comments}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Team Review Form Dialog */}
                        <TeamReviewForm
                            open={teamReviewFormOpen}
                            onClose={() => setTeamReviewFormOpen(false)}
                            employees={employees}
                            onSubmit={async (data) => {
                                const memberReviews = data.reviews.filter((r: any) => r.overallRating > 0 || r.kpis.some((k: any) => k.actual))
                                if (memberReviews.length === 0) throw new Error("No reviews to submit")
                                const results = await Promise.allSettled(
                                    memberReviews.map((rev: any) =>
                                        PerformanceAPI.createReview({
                                            employeeId: rev.employeeId,
                                            rating: rev.overallRating || 3,
                                            progress: Math.round(((rev.overallRating || 3) / 5) * 100),
                                            status: (rev.overallRating || 3) >= 4 ? "EXCELLENT" : (rev.overallRating || 3) >= 3 ? "GOOD" : "NEEDS_IMPROVEMENT",
                                            comments: rev.comments || `Team review for ${rev.employeeName || "team member"}`,
                                            reviewPeriod: format(new Date(), "MMMM yyyy"),
                                            formType: "TEAM_REVIEW",
                                            reviewType: "MANAGER",
                                            formData: { ...rev, config: data.config },
                                        })
                                    )
                                )
                                const failed = results.filter(r => r.status === "rejected")
                                if (failed.length > 0) throw new Error(`${failed.length} review(s) failed to submit`)
                                fetchAll()
                            }}
                        />
                    </div>
                )
            })()}

            {/* ═══════════ TEAM MODE ═══════════ */}
            {!teamReviewPage && mode === "team" && (
                <div className="flex gap-4 min-h-[calc(100vh-220px)]">
                    {/* Left Panel — Employee List */}
                    <div className="w-[320px] shrink-0 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-border space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-2">
                                    <FileTextIcon className="w-4 h-4 text-text-3" />
                                    {isCeoOrHr ? 'List of Reviews' : 'List of Team Members'}
                                </div>
                                {!isCeoOrHr && (
                                    <button
                                        onClick={() => setTeamReviewPage(true)}
                                        className="text-[11px] font-medium px-3 py-1 rounded-full bg-accent text-white hover:bg-accent/90 transition-all"
                                    >
                                        Team Review
                                    </button>
                                )}
                                {isCeoOrHr && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-text-3 mr-0.5">Filter by</span>
                                        <button
                                            onClick={() => setFilterMode("individual")}
                                            className={cn(
                                                "text-[10px] font-medium px-2.5 py-1 rounded-full transition-all",
                                                filterMode === "individual"
                                                    ? "bg-accent text-white shadow-sm"
                                                    : "bg-bg-2 text-text-3 hover:text-text-2 hover:bg-bg-2/80"
                                            )}
                                        >
                                            Employee
                                        </button>
                                        <button
                                            onClick={() => setFilterMode("team-wise")}
                                            className={cn(
                                                "text-[10px] font-medium px-2.5 py-1 rounded-full transition-all",
                                                filterMode === "team-wise"
                                                    ? "bg-accent text-white shadow-sm"
                                                    : "bg-bg-2 text-text-3 hover:text-text-2 hover:bg-bg-2/80"
                                            )}
                                        >
                                            Team
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={empSearch}
                                    onChange={(e) => setEmpSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text placeholder:text-text-4"
                                />
                            </div>
                            {isCeoOrHr && (
                                <div className="flex items-center gap-3 px-1 text-[10px] text-text-4">
                                    <span>{employees.length} employees</span>
                                    <span className="w-px h-3 bg-border" />
                                    <span>{reviews.length} total reviews</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Spinner />
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <PersonIcon className="w-8 h-8 text-text-4" />
                                    <p className="text-sm text-text-3">No employees found</p>
                                </div>
                            ) : filterMode === "team-wise" && isCeoOrHr ? (
                                /* ── Team-grouped view ── */
                                <div className="p-1.5 space-y-1">
                                    {teamGroups.map(([teamName, teamMembers]) => {
                                        const isCollapsed = collapsedDepts.has(teamName)
                                        const teamReviewCount = reviews.filter(r => teamMembers.some(e => e.id === r.employeeId)).length
                                        return (
                                            <div key={teamName}>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => toggleDept(teamName)}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-bg-2 transition-colors"
                                                    >
                                                        {isCollapsed
                                                            ? <ChevronRightIcon className="w-3.5 h-3.5 text-text-3 shrink-0" />
                                                            : <ChevronDownIcon className="w-3.5 h-3.5 text-text-3 shrink-0" />
                                                        }
                                                        <span className="text-xs font-bold text-text-2 flex-1">{teamName}</span>
                                                        <span className="text-[10px] text-text-4">{teamMembers.length} members</span>
                                                        {teamReviewCount > 0 && (
                                                            <span className="text-[10px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                                                                {teamReviewCount}
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const team = teams.find(t => t.name === teamName)
                                                            if (team) {
                                                                setSelectedEmployeeId(null)
                                                                setTeamReportSelectedReview(null)
                                                                setTeamReportOpen({ id: team.id, name: team.name })
                                                            }
                                                        }}
                                                        className="text-[10px] font-medium text-accent hover:text-accent/80 px-2 py-1 rounded-md hover:bg-accent/5 transition-colors shrink-0"
                                                    >
                                                        View Report
                                                    </button>
                                                </div>
                                                {!isCollapsed && (
                                                    <div className="ml-3">
                                                        {teamMembers.map((emp) => (
                                                            <EmployeeListItem
                                                                key={emp.id}
                                                                emp={emp}
                                                                isSelected={selectedEmployeeId === emp.id}
                                                                stats={employeeAvgRatings.get(emp.id)}
                                                                onClick={() => { setSelectedEmployeeId(emp.id); setTeamReportOpen(null) }}
                                                                showDept={false}
                                                                isTeamLead={teamLeadIds.has(emp.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                /* ── Individual flat list ── */
                                <div className="p-1.5">
                                    {filteredEmployees.map((emp) => (
                                        <EmployeeListItem
                                            key={emp.id}
                                            emp={emp}
                                            isSelected={selectedEmployeeId === emp.id}
                                            stats={employeeAvgRatings.get(emp.id)}
                                            onClick={() => { setSelectedEmployeeId(emp.id); setTeamReportOpen(null) }}
                                            showDept
                                            isTeamLead={teamLeadIds.has(emp.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel — Reviews for Selected Employee */}
                    <div className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
                        {/* Right panel header */}
                        <div className="px-5 py-3.5 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-text-2">
                                    {teamReportOpen
                                        ? <>Team Report — <span className="font-bold text-text">{teamReportOpen.name}</span></>
                                        : selectedEmployee
                                            ? <>Reviews for <span className="font-bold text-text">{selectedEmployee.firstName} {selectedEmployee.lastName}</span></>
                                            : isCeoOrHr
                                                ? "Select an employee to view their reviews"
                                                : "Select an employee to view and manage their reviews"
                                    }
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isCeoOrHr && (
                                        <Button size="sm" onClick={() => setMonthlyOpen(true)}>
                                            Monthly Review
                                        </Button>
                                    )}
                                    <span className="text-xs font-medium text-text-3 ml-2">
                                        {selectedEmployeeId ? filteredSelectedReviews.length : reviews.length} reviews
                                    </span>
                                </div>
                            </div>
                            {/* Review type filter chips (when employee is selected) */}
                            {selectedEmployeeId && selectedReviews.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2.5">
                                    {(["ALL", "DAILY", "MONTHLY", "SELF"] as const).map((type) => {
                                        const count = type === "ALL"
                                            ? selectedReviews.length
                                            : type === "SELF"
                                                ? selectedReviews.filter(r => r.reviewType === "SELF").length
                                                : selectedReviews.filter(r => r.formType === type).length
                                        if (type !== "ALL" && count === 0) return null
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setReviewTypeFilter(type)}
                                                className={cn(
                                                    "text-[11px] font-medium px-2.5 py-1 rounded-full transition-all",
                                                    reviewTypeFilter === type
                                                        ? "bg-accent text-white shadow-sm"
                                                        : "bg-bg-2 text-text-3 hover:text-text-2"
                                                )}
                                            >
                                                {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
                                                <span className="ml-1 opacity-70">{count}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Employee profile mini-card (CEO/HR only, when employee selected) */}
                        {isCeoOrHr && selectedEmployee && (
                            <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-accent/[0.03] to-transparent">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        name={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                                        src={selectedEmployee.avatarUrl || undefined}
                                        size="lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-text truncate">
                                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-text-3">{selectedEmployee.designation || "Employee"}</span>
                                            {selectedEmployee.department?.name && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-text-4" />
                                                    <span className="text-xs text-text-3">{selectedEmployee.department.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {(() => {
                                            const stats = employeeAvgRatings.get(selectedEmployee.id)
                                            if (!stats) return <span className="text-xs text-text-4">No reviews</span>
                                            return (
                                                <>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-text">{stats.count}</div>
                                                        <div className="text-[10px] text-text-4">Reviews</div>
                                                    </div>
                                                    <div className="w-px h-8 bg-border" />
                                                    <div className="text-center">
                                                        <div className={cn(
                                                            "text-lg font-bold",
                                                            stats.avg >= 4 ? "text-emerald-500" : stats.avg >= 3 ? "text-amber-500" : "text-rose-500"
                                                        )}>
                                                            {stats.avg.toFixed(1)}
                                                        </div>
                                                        <div className="text-[10px] text-text-4">Avg Rating</div>
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            {teamReportOpen ? (() => {
                                const team = teams.find(t => t.id === teamReportOpen.id)
                                const memberIds = team?.memberIds || []
                                const teamReviews = reviews.filter(r =>
                                    r.formType === "TEAM_REVIEW" && memberIds.includes(r.employeeId)
                                )

                                // Detail view for a selected team review
                                if (teamReportSelectedReview) {
                                    const rev = teamReportSelectedReview
                                    const fd = rev.formData as any
                                    return (
                                        <div className="p-4 space-y-4 overflow-y-auto">
                                            <button
                                                onClick={() => setTeamReportSelectedReview(null)}
                                                className="text-xs text-accent hover:underline flex items-center gap-1 mb-2"
                                            >
                                                <ChevronRightIcon className="w-3.5 h-3.5 rotate-180" />
                                                Back to list
                                            </button>
                                            <div className="border border-border rounded-xl overflow-hidden bg-surface">
                                                {/* Header */}
                                                <div className="bg-accent/10 border-b border-border px-5 py-3 flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-accent">
                                                        {fd?.name || `${rev.employee.firstName} ${rev.employee.lastName}`}
                                                        <span className="ml-2 text-text-3 normal-case font-normal italic text-xs">
                                                            — {fd?.role || rev.employee.designation || "Team Member"}
                                                        </span>
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        {(fd?.overallRating ?? rev.rating) > 0 && (
                                                            <Badge variant={(fd?.overallRating ?? rev.rating) >= 4 ? "success" : (fd?.overallRating ?? rev.rating) >= 3 ? "default" : "warning"}>
                                                                Rating: {fd?.overallRating ?? rev.rating}/5
                                                            </Badge>
                                                        )}
                                                        <span className="text-[10px] text-text-3">{format(new Date(rev.reviewDate), "dd MMM yyyy")}</span>
                                                    </div>
                                                </div>
                                                {fd ? (
                                                    <div className="p-5 space-y-4">
                                                        {/* KPIs */}
                                                        {fd.kpis && fd.kpis.length > 0 && (
                                                            <div className="rounded-lg border border-border overflow-hidden">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-accent/15 text-accent font-semibold">
                                                                            <th className="text-left px-3 py-2">KPI</th>
                                                                            <th className="text-center px-2 py-2">Target</th>
                                                                            <th className="text-center px-2 py-2">Actual</th>
                                                                            <th className="text-center px-2 py-2">% Achvmt</th>
                                                                            <th className="text-center px-2 py-2">TTF (days)</th>
                                                                            <th className="text-center px-2 py-2">OAR %</th>
                                                                            <th className="text-center px-2 py-2">Trend</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {fd.kpis.map((kpi: any, ki: number) => (
                                                                            <tr key={ki} className="border-t border-border">
                                                                                <td className="px-3 py-1.5 font-medium text-text-2">{kpi.name}</td>
                                                                                <td className="text-center px-2 py-1.5 text-text-3">{kpi.target || "—"}</td>
                                                                                <td className="text-center px-2 py-1.5">{kpi.actual || "—"}</td>
                                                                                <td className="text-center px-2 py-1.5 text-text-3">{kpi.achvmt || "—"}</td>
                                                                                <td className="text-center px-2 py-1.5 text-text-3">{kpi.ttf || "—"}</td>
                                                                                <td className="text-center px-2 py-1.5 text-text-3">{kpi.oar || "—"}</td>
                                                                                <td className="text-center px-2 py-1.5 text-text-3">{kpi.trend || "—"}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {/* Competencies */}
                                                        {fd.competencies && fd.competencies.length > 0 && (
                                                            <div className="rounded-lg border border-border overflow-hidden">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-accent/15 text-accent font-semibold">
                                                                            <th className="text-left px-3 py-2">Competency</th>
                                                                            <th className="text-center px-2 py-2 w-20">Rating</th>
                                                                            <th className="text-left px-3 py-2">Manager Notes</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {fd.competencies.map((comp: any, ci: number) => (
                                                                            <tr key={ci} className="border-t border-border">
                                                                                <td className="px-3 py-1.5 font-medium text-text-2">{comp.name}</td>
                                                                                <td className="text-center px-2 py-1.5">
                                                                                    {comp.rating > 0 ? (
                                                                                        <span className={cn(
                                                                                            "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                                                                                            comp.rating >= 4 ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                                                                            comp.rating >= 3 ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" :
                                                                                            "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                                                                        )}>{comp.rating}</span>
                                                                                    ) : "—"}
                                                                                </td>
                                                                                <td className="px-3 py-1.5 text-text-3">{comp.notes || "—"}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {/* Strengths / Gaps / Action Plan */}
                                                        {(fd.strengths || fd.gaps || fd.actionPlan) && (
                                                            <div className="rounded-lg border border-border overflow-hidden">
                                                                <div className="grid grid-cols-3 divide-x divide-border">
                                                                    {[
                                                                        { label: "Key Strengths", value: fd.strengths, color: "bg-amber-600/20 text-amber-700 dark:text-amber-400" },
                                                                        { label: "Development Gaps", value: fd.gaps, color: "bg-amber-600/20 text-amber-700 dark:text-amber-400" },
                                                                        { label: "Action Plan", value: fd.actionPlan, color: "bg-amber-600/20 text-amber-700 dark:text-amber-400" },
                                                                    ].map((item, idx) => (
                                                                        <div key={idx}>
                                                                            <div className={cn("px-3 py-1.5 text-xs font-bold border-b border-border", item.color)}>{item.label}</div>
                                                                            <p className="px-3 py-2 text-xs text-text-2 min-h-[48px]">{item.value || "—"}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Overall Rating */}
                                                        {fd.overallRating > 0 && (
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-semibold text-text-2">Overall Rating:</span>
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3, 4, 5].map(v => (
                                                                        <span key={v} className={cn(
                                                                            "w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold",
                                                                            fd.overallRating === v
                                                                                ? "border-accent bg-accent text-white"
                                                                                : "border-border text-text-4"
                                                                        )}>{v}</span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-text-3">
                                                                    {fd.overallRating === 1 ? "Needs Impr." : fd.overallRating === 2 ? "Below Exp." : fd.overallRating === 3 ? "Meets Exp." : fd.overallRating === 4 ? "Exceeds Exp." : "Outstanding"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-5">
                                                        <p className="text-xs text-text-3">{rev.comments || "No details available"}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }

                                // Empty state
                                if (teamReviews.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8">
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-center text-4xl shadow-sm">
                                                <span>&#128203;</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-text-2 mb-1">{teamReportOpen.name} — Team Report</p>
                                                <p className="text-xs text-text-4 max-w-[280px]">
                                                    No team reviews have been submitted yet. The team lead will fill this report for their team.
                                                </p>
                                            </div>
                                        </div>
                                    )
                                }

                                // Line items list
                                return (
                                    <div className="p-4 space-y-3 overflow-y-auto">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-sm font-bold text-text">{teamReportOpen.name} — Team Reviews</h3>
                                            <span className="text-xs text-text-3">{teamReviews.length} review(s)</span>
                                        </div>
                                        {teamReviews.map((rev) => {
                                            const fd = rev.formData as any
                                            return (
                                                <button
                                                    key={rev.id}
                                                    onClick={() => setTeamReportSelectedReview(rev)}
                                                    className="w-full text-left p-4 bg-bg-2/50 hover:bg-accent/[0.04] border border-border/60 rounded-xl transition-all group"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar
                                                                name={`${rev.employee.firstName} ${rev.employee.lastName}`}
                                                                size="xs"
                                                            />
                                                            <span className="text-sm font-semibold text-text">
                                                                {fd?.name || `${rev.employee.firstName} ${rev.employee.lastName}`}
                                                            </span>
                                                            <span className="text-xs text-text-4 italic">
                                                                {fd?.role || rev.employee.designation || "Team Member"}
                                                            </span>
                                                        </div>
                                                        {getStatusBadge(rev.status)}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <span className="text-warning tracking-wider text-sm">{"★".repeat(Math.floor(rev.rating))}</span>
                                                                <span className="text-text-4 tracking-wider text-sm">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                                                <span className="text-xs text-text-3 font-mono ml-1">{rev.rating.toFixed(1)}</span>
                                                            </div>
                                                            <div className="text-xs text-text-3">
                                                                {format(new Date(rev.reviewDate), "MMM d, yyyy")}
                                                                {rev.reviewPeriod && <span className="ml-2 text-text-4">{rev.reviewPeriod}</span>}
                                                                {rev.reviewer && (
                                                                    <span className="ml-2">by {rev.reviewer.firstName} {rev.reviewer.lastName}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View Details &rarr;
                                                        </span>
                                                    </div>
                                                    {rev.comments && (
                                                        <p className="text-xs text-text-3 mt-2 line-clamp-2">{rev.comments}</p>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })() : !selectedEmployeeId ? (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center text-4xl shadow-sm">
                                        <span>&#128193;</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-2 mb-1">No employee selected</p>
                                        <p className="text-xs text-text-4 max-w-[240px]">
                                            {isCeoOrHr
                                                ? "Choose an employee from the list to browse their performance reviews"
                                                : "Select an employee to view and manage their reviews"
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : filteredSelectedReviews.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center text-4xl shadow-sm">
                                        <span>&#128193;</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-2 mb-1">No reviews yet</p>
                                        <p className="text-xs text-text-4 max-w-[240px]">
                                            {reviewTypeFilter !== "ALL"
                                                ? `No ${reviewTypeFilter.toLowerCase()} reviews found. Try selecting "All" to see all review types.`
                                                : "No performance reviews have been submitted for this employee yet."
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 space-y-3">
                                    {filteredSelectedReviews.map((rev) => (
                                        <ReviewCard key={rev.id} rev={rev} onClick={() => setViewReview(rev)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ SELF REVIEW MODE (Team Lead only) ═══════════ */}
            {!teamReviewPage && !isCeoOrHr && mode === "self" && (
                <div className="space-y-6">
                    {/* Self Review Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            label="Self Reviews Submitted"
                            value={isLoading ? "—" : selfReviews.length}
                            icon={<span className="text-lg">&#128221;</span>}
                            className="border-emerald-500/20"
                        />
                        <StatCard
                            label="Average Self-Rating"
                            value={isLoading ? "—" : selfAvgRating > 0 ? `${selfAvgRating.toFixed(1)} / 5.0` : "—"}
                            icon={<span className="text-lg">&#11088;</span>}
                            className="border-amber-500/20"
                        />
                        <StatCard
                            label="Latest Status"
                            value={isLoading ? "—" : latestSelfReview?.status || "No reviews"}
                            icon={<span className="text-lg">&#128200;</span>}
                            className="border-info/20"
                        />
                    </div>

                    {/* Submit Self Review Buttons */}
                    <div className="flex justify-end gap-2">
                        <Button
                            onClick={() => handleOpenSelfReview("monthly")}
                            leftIcon={<PlusIcon className="w-4 h-4" />}
                        >
                            Monthly Self Review
                        </Button>
                    </div>

                    {/* Self Review History */}
                    <Card>
                        <CardHeader className="border-b border-border flex-row items-center justify-between">
                            <CardTitle className="text-base">My Self-Review History</CardTitle>
                            <span className="text-xs text-text-3">{selfReviews.length} reviews</span>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Spinner size="lg" />
                                </div>
                            ) : selfReviews.length === 0 ? (
                                <EmptyState
                                    title="No self-reviews yet"
                                    description="Submit your first self-assessment to track your growth over time."
                                    action={
                                        <Button
                                            onClick={() => handleOpenSelfReview("monthly")}
                                            leftIcon={<PlusIcon className="w-4 h-4" />}
                                        >
                                            Monthly Self Review
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="divide-y divide-border">
                                    {selfReviews.map((rev) => (
                                        <button
                                            key={rev.id}
                                            onClick={() => setViewReview(rev)}
                                            className="w-full text-left px-6 py-4 hover:bg-accent/[0.03] transition-colors group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="info" size="sm">SELF</Badge>
                                                    {rev.formType && (
                                                        <Badge
                                                            variant={rev.formType === "DAILY" ? "default" : "neutral"}
                                                            size="sm"
                                                        >
                                                            {rev.formType}
                                                        </Badge>
                                                    )}
                                                    {rev.reviewPeriod && (
                                                        <span className="text-xs text-text-3">{rev.reviewPeriod}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(rev.status)}
                                                    <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View Details &rarr;
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-warning tracking-wider text-sm">{"★".repeat(Math.floor(rev.rating))}</span>
                                                    <span className="text-text-4 tracking-wider text-sm">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                                    <span className="text-xs text-text-3 font-mono ml-1">{rev.rating.toFixed(1)}</span>
                                                </div>
                                                <span className="text-xs text-text-3 font-mono">
                                                    {format(new Date(rev.reviewDate), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                            {rev.comments && (
                                                <p className="text-xs text-text-3 mt-2 line-clamp-2">{rev.comments}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            </>)}

            {/* ═══════════ DIALOGS ═══════════ */}

            {/* Daily Review Dialog — Team Lead only */}
            {!isCeoOrHr && (
                <Dialog open={dailyOpen} onClose={() => setDailyOpen(false)} size="full">
                    <DialogHeader>
                        <DialogTitle>Daily Performance Review</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <DailyReviewForm
                            employees={employees}
                            onSubmit={handleSubmitReview}
                            onCancel={() => setDailyOpen(false)}
                            defaultActivityMetrics={perfTemplate.dailyMetrics}
                            defaultBehavioralItems={perfTemplate.dailyCompetencies}
                        />
                    </DialogBody>
                </Dialog>
            )}

            {/* Monthly Review Dialog — Team Lead only */}
            {!isCeoOrHr && (
                <Dialog open={monthlyOpen} onClose={() => setMonthlyOpen(false)} size="full">
                    <DialogHeader>
                        <DialogTitle>Monthly Performance Review</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <MonthlyReviewForm
                            employees={employees}
                            onSubmit={handleSubmitReview}
                            onCancel={() => setMonthlyOpen(false)}
                        />
                    </DialogBody>
                </Dialog>
            )}

            {/* Daily Self Review Dialog — Team Lead only */}
            {!isCeoOrHr && (
                <Dialog open={dailySelfOpen} onClose={() => setDailySelfOpen(false)} size="full">
                    <DialogHeader>
                        <DialogTitle>Daily Self Review</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {selfEmployeeId && (
                            <DailySelfReviewForm
                                employeeId={selfEmployeeId}
                                onSubmit={handleSubmitReview}
                                onCancel={() => setDailySelfOpen(false)}
                                defaultActivityMetrics={perfTemplate.dailyMetrics}
                                defaultBehavioralItems={perfTemplate.dailyCompetencies}
                            />
                        )}
                    </DialogBody>
                </Dialog>
            )}

            {/* Monthly Self Review Dialog — Team Lead only */}
            {!isCeoOrHr && (
                <Dialog open={selfReviewOpen} onClose={() => setSelfReviewOpen(false)} size="full">
                    <DialogHeader>
                        <DialogTitle>Monthly Performance Review & Team Tracking Report</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {selfEmployeeId && (
                            <LeaderMonthlySelfReview
                                employeeId={selfEmployeeId}
                                onSubmit={handleSubmitReview}
                                onCancel={() => setSelfReviewOpen(false)}
                            />
                        )}
                    </DialogBody>
                </Dialog>
            )}

            {/* View Review Detail Dialog */}
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
        </div>
    )
}

/** Reusable employee list item for the left panel */
function EmployeeListItem({ emp, isSelected, stats, onClick, showDept, isTeamLead }: {
    emp: Employee
    isSelected: boolean
    stats?: { avg: number; count: number; latest: string }
    onClick: () => void
    showDept: boolean
    isTeamLead?: boolean
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                isSelected
                    ? "bg-accent/10 border border-accent/20"
                    : "hover:bg-bg-2 border border-transparent"
            )}
        >
            <Avatar
                name={`${emp.firstName} ${emp.lastName}`}
                src={emp.avatarUrl || undefined}
                size="sm"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={cn(
                        "text-sm font-semibold truncate",
                        isSelected ? "text-accent" : "text-text"
                    )}>
                        {emp.firstName} {emp.lastName}
                    </span>
                    {isTeamLead && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            Team Lead
                        </span>
                    )}
                </div>
                <div className="text-[11px] text-text-3 truncate">
                    {emp.designation || (showDept ? emp.department?.name : null) || "Employee"}
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {stats ? (
                    <>
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            stats.avg >= 4 ? "bg-emerald-500/10 text-emerald-600" :
                            stats.avg >= 3 ? "bg-amber-500/10 text-amber-600" :
                            "bg-rose-500/10 text-rose-600"
                        )}>
                            {stats.avg.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                            {stats.count}
                        </span>
                    </>
                ) : (
                    <span className="text-[10px] text-text-4 italic">new</span>
                )}
            </div>
        </button>
    )
}

/** Reusable review card used in team mode */
function ReviewCard({ rev, onClick }: { rev: PerformanceReview; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-4 bg-bg-2/50 hover:bg-accent/[0.04] border border-border/60 rounded-xl transition-all group"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Badge
                        variant={rev.formType === "DAILY" ? "default" : rev.formType === "LEADER_MONTHLY" ? "success" : rev.formType === "MONTHLY" ? "neutral" : rev.formType === "TEAM_REVIEW" ? "default" : "warning"}
                        size="sm"
                    >
                        {rev.formType === "LEADER_MONTHLY" ? "Leader Monthly" : rev.formType === "TEAM_REVIEW" ? "Team Review" : rev.formType || "Legacy"}
                    </Badge>
                    {rev.reviewPeriod && (
                        <span className="text-xs text-text-3">{rev.reviewPeriod}</span>
                    )}
                </div>
                {getStatusBadge(rev.status)}
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-warning tracking-wider text-sm">{"★".repeat(Math.floor(rev.rating))}</span>
                        <span className="text-text-4 tracking-wider text-sm">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                        <span className="text-xs text-text-3 font-mono ml-1">{rev.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-xs text-text-3">
                        {format(new Date(rev.reviewDate), "MMM d, yyyy")}
                        {rev.reviewer && (
                            <span className="ml-2">by {rev.reviewer.firstName} {rev.reviewer.lastName}</span>
                        )}
                    </div>
                </div>
                <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details &rarr;
                </span>
            </div>

            {rev.comments && (
                <p className="text-xs text-text-3 mt-2 line-clamp-2">{rev.comments}</p>
            )}
        </button>
    )
}
