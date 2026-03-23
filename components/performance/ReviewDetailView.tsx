"use client"

import * as React from "react"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface ReviewDetailViewProps {
    review: any
}

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
    up: { icon: "↑", color: "text-success" },
    down: { icon: "↓", color: "text-danger" },
    same: { icon: "→", color: "text-text-3" },
}

const OVERALL_LABELS: Record<number, string> = {
    1: "Needs Improvement",
    2: "Below Expectations",
    3: "Meets Expectations",
    4: "Exceeds Expectations",
    5: "Outstanding",
}

function RatingDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: max }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        i < rating ? "bg-accent text-white" : "bg-bg-2 text-text-4"
                    )}
                >
                    {i + 1}
                </div>
            ))}
            <span className="ml-2 text-sm font-bold text-text">{rating} / {max}</span>
        </div>
    )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-bold text-text-3 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="shrink-0">{children}</span>
            <div className="h-px flex-1 bg-border" />
        </h3>
    )
}

function DailyDetail({ formData }: { formData: any }) {
    return (
        <div className="space-y-6">
            {/* Activity Metrics */}
            {formData.activityMetrics?.length > 0 && (
                <div>
                    <SectionTitle>Activity Metrics</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Metric</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Target</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Actual</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.activityMetrics.map((m: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{m.metric}</td>
                                        <td className="px-4 py-2.5 text-sm text-text-3 text-center font-mono">{m.target || "—"}</td>
                                        <td className="px-4 py-2.5 text-sm text-center font-mono font-bold text-text">{m.actual || "—"}</td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{m.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Behavioral Ratings */}
            {formData.behavioralRatings?.length > 0 && (
                <div>
                    <SectionTitle>Behavioral Ratings</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Competency</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Rating</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.behavioralRatings.map((r: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{r.competency}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <RatingDisplay rating={r.rating} />
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{r.comments || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Priorities */}
            {formData.priorities?.length > 0 && (
                <div>
                    <SectionTitle>Priorities</SectionTitle>
                    <div className="space-y-2">
                        {formData.priorities.map((p: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-bg-2/50 rounded-lg">
                                <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                                <span className="text-sm text-text">{p}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Blockers */}
            {formData.blockers && (
                <div>
                    <SectionTitle>Blockers / Challenges</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{formData.blockers}</p>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.keyWins && (
                    <div>
                        <SectionTitle>Key Wins</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{formData.keyWins}</p>
                    </div>
                )}
                {formData.actionItems && (
                    <div>
                        <SectionTitle>Action Items</SectionTitle>
                        <p className="text-sm text-text bg-accent/5 border border-accent/10 rounded-lg p-4">{formData.actionItems}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function MonthlyDetail({ formData }: { formData: any }) {
    return (
        <div className="space-y-6">
            {/* KPI Scorecard */}
            {formData.kpiScorecard?.length > 0 && (
                <div>
                    <SectionTitle>KPI Scorecard</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-surface-2 border-b border-border">
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">KPI</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Target</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Actual</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Achievement</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.kpiScorecard.map((k: any, i: number) => (
                                        <tr key={i} className="border-b border-border/50 last:border-0">
                                            <td className="px-4 py-2.5 text-sm font-medium text-text">{k.kpi}</td>
                                            <td className="px-4 py-2.5 text-sm text-text-3 text-center font-mono">{k.target || "—"}</td>
                                            <td className="px-4 py-2.5 text-sm text-center font-mono font-bold text-text">{k.actual || "—"}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    k.achievement >= 100 ? "text-success" :
                                                        k.achievement >= 75 ? "text-accent" :
                                                            k.achievement > 0 ? "text-warning" : "text-text-4"
                                                )}>
                                                    {k.achievement > 0 ? `${k.achievement}%` : "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={cn("font-bold", TREND_ICONS[k.trend]?.color)}>
                                                    {TREND_ICONS[k.trend]?.icon || "—"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Competency Ratings */}
            {formData.competencyRatings?.length > 0 && (
                <div>
                    <SectionTitle>Competency Ratings</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Area</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Rating</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.competencyRatings.map((c: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{c.area}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <RatingDisplay rating={c.rating} />
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{c.comments || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Overall Rating */}
            {formData.overallRating && (
                <div>
                    <SectionTitle>Overall Rating</SectionTitle>
                    <div className="flex items-center gap-4 p-6 bg-surface border border-border rounded-xl">
                        <div className={cn(
                            "text-4xl font-extrabold",
                            formData.overallRating >= 4 ? "text-success" :
                                formData.overallRating >= 3 ? "text-accent" : "text-warning"
                        )}>
                            {formData.overallRating}
                        </div>
                        <div>
                            <div className="text-lg font-bold text-text">/ 5.0</div>
                            <div className="text-sm text-text-3">
                                {OVERALL_LABELS[formData.overallRating] || ""}
                            </div>
                        </div>
                        <div className="ml-auto flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn(
                                    "text-xl",
                                    i < formData.overallRating ? "text-warning" : "text-text-4"
                                )}>
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Goals & Development */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.accomplishments && (
                    <div>
                        <SectionTitle>Key Accomplishments</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{formData.accomplishments}</p>
                    </div>
                )}
                {formData.areasForImprovement && (
                    <div>
                        <SectionTitle>Areas for Improvement</SectionTitle>
                        <p className="text-sm text-text bg-warning/5 border border-warning/10 rounded-lg p-4">{formData.areasForImprovement}</p>
                    </div>
                )}
            </div>

            {/* Goals for Next Month */}
            {formData.goalsForNextMonth?.length > 0 && (
                <div>
                    <SectionTitle>Goals for Next Month</SectionTitle>
                    <div className="space-y-2">
                        {formData.goalsForNextMonth.map((g: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-bg-2/50 rounded-lg">
                                <span className="text-xs font-bold text-purple w-5">{i + 1}.</span>
                                <span className="text-sm text-text">{g}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Training Plan */}
            {formData.trainingPlan && (
                <div>
                    <SectionTitle>Training / Development Plan</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{formData.trainingPlan}</p>
                </div>
            )}

            {/* Manager Comments */}
            {formData.managerComments && (
                <div>
                    <SectionTitle>Manager&apos;s Comments</SectionTitle>
                    <p className="text-sm text-text bg-accent/5 border border-accent/10 rounded-lg p-4">{formData.managerComments}</p>
                </div>
            )}
        </div>
    )
}

function LeaderMonthlyDetail({ formData }: { formData: any }) {
    const fd = formData
    return (
        <div className="space-y-6">
            {/* Section 1 — Leader Information */}
            <div>
                <SectionTitle>Leader Information</SectionTitle>
                <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            <tr className="border-b border-border">
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2 w-[160px]">Leader Name</td>
                                <td className="px-4 py-2 text-text">{fd.leaderName || "—"}</td>
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2 w-[160px]">Title / Level</td>
                                <td className="px-4 py-2 text-text">{fd.titleLevel || "—"}</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2">Department</td>
                                <td className="px-4 py-2 text-text">{fd.department || "—"}</td>
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2">Business Unit</td>
                                <td className="px-4 py-2 text-text">{fd.businessUnit || "—"}</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2">Direct Manager</td>
                                <td className="px-4 py-2 text-text">{fd.directManager || "—"}</td>
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2">Review Month / Year</td>
                                <td className="px-4 py-2 text-text">{fd.reviewMonthYear || "—"}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2">Total Team Members</td>
                                <td className="px-4 py-2 text-text">{fd.totalTeamMembers || "—"}</td>
                                <td className="px-4 py-2 font-semibold text-text-3 bg-bg-2">Review Date</td>
                                <td className="px-4 py-2 text-text">{fd.reviewDate || "—"}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 2 — Team Composition Snapshot */}
            {fd.teamComposition && (
                <div>
                    <SectionTitle>Team Composition Snapshot</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden mb-3">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-accent/15">
                                    <th className="px-3 py-2 text-accent font-semibold">Total Recruiters</th>
                                    <th className="px-3 py-2 text-accent font-semibold">Fully Ramped</th>
                                    <th className="px-3 py-2 text-accent font-semibold">In Ramp-Up</th>
                                    <th className="px-3 py-2 text-accent font-semibold">On PIP / Watch</th>
                                    <th className="px-3 py-2 text-accent font-semibold">High Performers</th>
                                    <th className="px-3 py-2 text-accent font-semibold">Open HC Slots</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="text-center">
                                    <td className="px-3 py-2 font-bold text-text">{fd.teamComposition.totalRecruiters || "—"}</td>
                                    <td className="px-3 py-2 text-text">{fd.teamComposition.fullyRamped || "—"}</td>
                                    <td className="px-3 py-2 text-text">{fd.teamComposition.inRampUp || "—"}</td>
                                    <td className="px-3 py-2 text-text">{fd.teamComposition.onPipWatch || "—"}</td>
                                    <td className="px-3 py-2 text-text">{fd.teamComposition.highPerformers || "—"}</td>
                                    <td className="px-3 py-2 text-text">{fd.teamComposition.openHcSlots || "—"}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Team Members Table */}
                    {fd.teamMembers?.length > 0 && (
                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="bg-accent/15">
                                        <th className="px-3 py-2 text-left text-accent font-semibold">#</th>
                                        <th className="px-3 py-2 text-left text-accent font-semibold">Name</th>
                                        <th className="px-3 py-2 text-accent font-semibold">Role</th>
                                        <th className="px-3 py-2 text-accent font-semibold">Hires</th>
                                        <th className="px-3 py-2 text-accent font-semibold">TTF</th>
                                        <th className="px-3 py-2 text-accent font-semibold">OAR %</th>
                                        <th className="px-3 py-2 text-accent font-semibold">Submittals</th>
                                        <th className="px-3 py-2 text-accent font-semibold">Rating</th>
                                        <th className="px-3 py-2 text-accent font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fd.teamMembers.map((m: any, i: number) => (
                                        <tr key={i} className="border-t border-border">
                                            <td className="px-3 py-1.5 text-text-3">{i + 1}</td>
                                            <td className="px-3 py-1.5 font-medium text-text">{m.name}</td>
                                            <td className="px-3 py-1.5 text-center text-text-3">{m.role || "—"}</td>
                                            <td className="px-3 py-1.5 text-center">{m.hires || "—"}</td>
                                            <td className="px-3 py-1.5 text-center">{m.ttf || "—"}</td>
                                            <td className="px-3 py-1.5 text-center">{m.oar || "—"}</td>
                                            <td className="px-3 py-1.5 text-center">{m.submittals || "—"}</td>
                                            <td className="px-3 py-1.5 text-center font-bold">{m.rating || "—"}</td>
                                            <td className="px-3 py-1.5 text-center">
                                                <Badge variant={m.status === "Active" ? "success" : m.status === "PIP" ? "warning" : "neutral"} size="sm">
                                                    {m.status || "—"}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Section 3 — Leader KPI Scorecard */}
            {fd.kpis?.length > 0 && (
                <div>
                    <SectionTitle>Leader KPI Scorecard — Team Aggregates</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-accent/15">
                                    <th className="px-3 py-2 text-left text-accent font-semibold">KPI / Metric</th>
                                    <th className="px-3 py-2 text-center text-accent font-semibold">Monthly Target</th>
                                    <th className="px-3 py-2 text-center text-accent font-semibold">Team Actual</th>
                                    <th className="px-3 py-2 text-center text-accent font-semibold">% Achievement</th>
                                    <th className="px-3 py-2 text-center text-accent font-semibold">Per-Recruiter Avg</th>
                                    <th className="px-3 py-2 text-center text-accent font-semibold">Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fd.kpis.map((k: any, i: number) => (
                                    <tr key={i} className="border-t border-border">
                                        <td className="px-3 py-1.5 font-medium text-text">{k.metric}</td>
                                        <td className="text-center px-3 py-1.5 text-text-3">{k.monthlyTarget || "—"}</td>
                                        <td className="text-center px-3 py-1.5 font-bold text-text">{k.teamActual || "—"}</td>
                                        <td className="text-center px-3 py-1.5">{k.achievement || "—"}</td>
                                        <td className="text-center px-3 py-1.5 text-text-3">{k.perRecruiterAvg || "—"}</td>
                                        <td className="text-center px-3 py-1.5 text-text-3">{k.trend || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section 4 — Leadership Competency Ratings */}
            {fd.competencies?.length > 0 && (
                <div>
                    <SectionTitle>Leadership Competency Ratings</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-accent/15">
                                    <th className="px-3 py-2 text-left text-accent font-semibold">Competency</th>
                                    <th className="px-3 py-2 text-center text-accent font-semibold w-20">Rating</th>
                                    <th className="px-3 py-2 text-left text-accent font-semibold">Evidence / Examples</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fd.competencies.map((c: any, i: number) => (
                                    <tr key={i} className="border-t border-border">
                                        <td className="px-3 py-1.5 font-medium text-text">{c.name}</td>
                                        <td className="text-center px-3 py-1.5">
                                            {c.rating > 0 ? (
                                                <span className={cn(
                                                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                                                    c.rating >= 4 ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                                    c.rating >= 3 ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" :
                                                    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                                )}>{c.rating}</span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-3 py-1.5 text-text-3">{c.evidence || "—"}</td>
                                    </tr>
                                ))}
                                {fd.weightedAvgScore && (
                                    <tr className="border-t-2 border-border bg-bg-2 font-bold">
                                        <td className="px-3 py-2 text-xs font-bold text-text uppercase">Weighted Average Leadership Score</td>
                                        <td className="text-center px-3 py-2 text-accent font-bold">{fd.weightedAvgScore}</td>
                                        <td></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Section 5 — Overall Rating */}
            {fd.overallRating > 0 && (
                <div>
                    <SectionTitle>Overall Leader Performance Rating</SectionTitle>
                    <div className="flex items-center gap-4 p-6 bg-surface border border-border rounded-xl">
                        <div className={cn(
                            "text-4xl font-extrabold",
                            fd.overallRating >= 4 ? "text-success" : fd.overallRating >= 3 ? "text-accent" : "text-warning"
                        )}>{fd.overallRating}</div>
                        <div>
                            <div className="text-lg font-bold text-text">/ 5.0</div>
                            <div className="text-sm text-text-3">{OVERALL_LABELS[fd.overallRating] || ""}</div>
                        </div>
                        <div className="ml-auto flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn("text-xl", i < fd.overallRating ? "text-warning" : "text-text-4")}>★</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Section 6 — Team Health */}
            {fd.teamHealth && (
                <div>
                    <SectionTitle>Team Health, Risks & Escalations</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            { label: "Engagement & Morale", value: fd.teamHealth.engagement, color: "border-accent/20 bg-accent/5" },
                            { label: "At-Risk Recruiters", value: fd.teamHealth.atRisk, color: "border-warning/20 bg-warning/5" },
                            { label: "Escalations", value: fd.teamHealth.escalations, color: "border-danger/20 bg-danger/5" },
                            { label: "Attrition / Turnover", value: fd.teamHealth.attrition, color: "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5" },
                            { label: "Headcount Gaps", value: fd.teamHealth.headcountGaps, color: "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5" },
                            { label: "Training Needs", value: fd.teamHealth.trainingNeeds, color: "border-teal-200 bg-teal-50 dark:border-teal-500/20 dark:bg-teal-500/5" },
                        ].map((item, i) => (
                            <div key={i} className={cn("border rounded-lg p-3", item.color)}>
                                <div className="text-[10px] font-bold text-text-3 uppercase mb-1">{item.label}</div>
                                <p className="text-xs text-text">{item.value || "—"}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 7 — Goals & Development */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fd.accomplishments && (
                    <div>
                        <SectionTitle>Key Accomplishments</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{fd.accomplishments}</p>
                    </div>
                )}
                {fd.areasForImprovement && (
                    <div>
                        <SectionTitle>Areas for Improvement</SectionTitle>
                        <p className="text-sm text-text bg-warning/5 border border-warning/10 rounded-lg p-4">{fd.areasForImprovement}</p>
                    </div>
                )}
            </div>

            {fd.goalsNextMonth?.length > 0 && (
                <div>
                    <SectionTitle>Goals for Next Month</SectionTitle>
                    <div className="space-y-2">
                        {fd.goalsNextMonth.map((g: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-bg-2/50 rounded-lg">
                                <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                                <span className="text-sm text-text">{g}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {fd.devTrainingPlan && (
                <div>
                    <SectionTitle>Development / Training Plan</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{fd.devTrainingPlan}</p>
                </div>
            )}

            {/* Section 8 — Feedback */}
            {(fd.seniorManagerComments || fd.leaderSelfAssessment || fd.agreedActionItems) && (
                <div>
                    <SectionTitle>Feedback & Commentary</SectionTitle>
                    <div className="space-y-3">
                        {fd.seniorManagerComments && (
                            <div className="border border-border rounded-lg p-4">
                                <div className="text-[10px] font-bold text-text-3 uppercase mb-1">Senior Manager / Director Comments</div>
                                <p className="text-sm text-text">{fd.seniorManagerComments}</p>
                            </div>
                        )}
                        {fd.leaderSelfAssessment && (
                            <div className="border border-accent/20 bg-accent/5 rounded-lg p-4">
                                <div className="text-[10px] font-bold text-text-3 uppercase mb-1">Leader Self-Assessment / Response</div>
                                <p className="text-sm text-text">{fd.leaderSelfAssessment}</p>
                            </div>
                        )}
                        {fd.agreedActionItems && (
                            <div className="border border-success/20 bg-success/5 rounded-lg p-4">
                                <div className="text-[10px] font-bold text-text-3 uppercase mb-1">Agreed Action Items & Commitments</div>
                                <p className="text-sm text-text">{fd.agreedActionItems}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Section 9 — Signatures */}
            {fd.signatures && (
                <div>
                    <SectionTitle>Sign-Off & Acknowledgment</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Team Lead / Manager", data: fd.signatures.leader },
                            { label: "Reviewing Director", data: fd.signatures.director },
                            { label: "HR Business Partner", data: fd.signatures.hrPartner },
                        ].map((s, i) => (
                            <div key={i} className="border border-border rounded-lg p-3">
                                <div className="text-[10px] font-bold text-text-3 uppercase mb-2">{s.label}</div>
                                <p className="text-sm font-medium text-text">{s.data?.name || "—"}</p>
                                {s.data?.date && <p className="text-xs text-text-3 mt-1">Date: {s.data.date}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function SourceOneMonthlyDetail({ formData }: { formData: any }) {
    const fd = formData
    return (
        <div className="space-y-6">
            {/* Recruiter Metrics Table */}
            {fd.recruiterMetrics?.length > 0 && (
                <div>
                    <SectionTitle>Recruiter Performance Metrics</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase w-10">S.No.</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Metric</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Target</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Achieved</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Conversion %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fd.recruiterMetrics.map((m: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-center text-xs text-text-4">{m.serialNo || i + 1}</td>
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{m.metric}</td>
                                        <td className="px-4 py-2.5 text-sm text-center font-mono text-text-3">{m.target ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-sm text-center font-mono font-bold text-text">{m.achieved ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={cn(
                                                "text-sm font-bold",
                                                (m.conversionPct ?? 0) >= 100 ? "text-success" :
                                                (m.conversionPct ?? 0) >= 75 ? "text-accent" :
                                                (m.conversionPct ?? 0) >= 50 ? "text-warning" : "text-danger"
                                            )}>
                                                {m.conversionPct != null ? `${m.conversionPct}%` : "—"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Team Lead Metrics */}
            {fd.teamLeadMetrics?.length > 0 && (
                <div>
                    <SectionTitle>Team Lead Assessment Metrics</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase w-10">S.No.</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Metric</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Details/Evidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fd.teamLeadMetrics.map((m: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-center text-xs text-text-4">{m.serialNo || i + 1}</td>
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{m.metric}</td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{m.details || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Rating & Score */}
            {(fd.rating || fd.scorePercentage) && (
                <div>
                    <SectionTitle>Rating & Score</SectionTitle>
                    <div className="flex items-center gap-6 p-6 bg-surface border border-border rounded-xl">
                        {fd.rating && (
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "text-4xl font-extrabold",
                                    fd.rating >= 4 ? "text-success" : fd.rating >= 3 ? "text-accent" : "text-warning"
                                )}>{fd.rating}</div>
                                <div>
                                    <div className="text-lg font-bold text-text">/ 5</div>
                                    <div className="text-sm text-text-3">{fd.ratingCategoryDisplay || fd.ratingCategory || ""}</div>
                                </div>
                            </div>
                        )}
                        {fd.scorePercentage != null && (
                            <div className="ml-auto text-right">
                                <div className="text-2xl font-bold text-accent">{fd.scorePercentage}%</div>
                                <div className="text-xs text-text-3">Overall Score</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reviewer Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fd.strengthsObserved && (
                    <div>
                        <SectionTitle>Strengths Observed</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{fd.strengthsObserved}</p>
                    </div>
                )}
                {fd.areasForImprovement && (
                    <div>
                        <SectionTitle>Areas for Improvement</SectionTitle>
                        <p className="text-sm text-text bg-warning/5 border border-warning/10 rounded-lg p-4">{fd.areasForImprovement}</p>
                    </div>
                )}
            </div>

            {fd.reviewerRemarks && (
                <div>
                    <SectionTitle>Reviewer Remarks</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{fd.reviewerRemarks}</p>
                </div>
            )}

            {fd.actionItems && (
                <div>
                    <SectionTitle>Action Items</SectionTitle>
                    <p className="text-sm text-text bg-accent/5 border border-accent/10 rounded-lg p-4">{fd.actionItems}</p>
                </div>
            )}

            {/* Signatures */}
            <div>
                <SectionTitle>Signatures</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Employee", date: fd.employeeSignedAt },
                        { label: "Manager", date: fd.managerSignedAt },
                        { label: "HR", date: fd.hrSignedAt },
                    ].map((s, i) => (
                        <div key={i} className="border border-border rounded-lg p-3 text-center">
                            <div className="text-[10px] font-bold text-text-3 uppercase mb-2">{s.label}</div>
                            {s.date ? (
                                <div>
                                    <Badge variant="success" size="sm">Signed</Badge>
                                    <p className="text-xs text-text-4 mt-1">{format(new Date(s.date), "dd MMM yyyy")}</p>
                                </div>
                            ) : (
                                <Badge variant="neutral" size="sm">Pending</Badge>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function SourceOneAppraisalDetail({ formData }: { formData: any }) {
    const fd = formData
    return (
        <div className="space-y-6">
            {/* Review Info */}
            <div className="flex items-center gap-4 p-4 bg-purple/5 border border-purple/10 rounded-xl">
                <Badge variant={fd.reviewType === "ANNUAL" ? "purple" : "default"} size="lg">
                    {fd.reviewTypeDisplay || fd.reviewType}
                </Badge>
                <span className="text-sm text-text-3">Period: {fd.reviewPeriod}</span>
                <span className="text-sm text-text-3">FY: {fd.financialYear}</span>
                {fd.isEligible === false && fd.eligibilityReason && (
                    <Badge variant="warning" size="sm">{fd.eligibilityReason}</Badge>
                )}
            </div>

            {/* Overall Rating */}
            {fd.overallRating && (
                <div>
                    <SectionTitle>Overall Appraisal Rating</SectionTitle>
                    <div className="flex items-center gap-4 p-6 bg-surface border border-border rounded-xl">
                        <div className={cn(
                            "text-4xl font-extrabold",
                            fd.overallRating >= 4 ? "text-success" : fd.overallRating >= 3 ? "text-accent" : "text-warning"
                        )}>{fd.overallRating}</div>
                        <div>
                            <div className="text-lg font-bold text-text">/ 5</div>
                            <div className="text-sm text-text-3">{fd.finalRatingCategory || ""}</div>
                        </div>
                        {fd.outcomeDisplay && (
                            <Badge variant={fd.overallRating >= 4 ? "success" : fd.overallRating >= 3 ? "default" : "warning"} size="lg" className="ml-auto">
                                {fd.outcomeDisplay}
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Key Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fd.keyStrengths && (
                    <div>
                        <SectionTitle>Key Strengths</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{fd.keyStrengths}</p>
                    </div>
                )}
                {fd.developmentAreas && (
                    <div>
                        <SectionTitle>Development Areas</SectionTitle>
                        <p className="text-sm text-text bg-warning/5 border border-warning/10 rounded-lg p-4">{fd.developmentAreas}</p>
                    </div>
                )}
                {fd.goalsNextPeriod && (
                    <div>
                        <SectionTitle>Goals for Next Period</SectionTitle>
                        <p className="text-sm text-text bg-accent/5 border border-accent/10 rounded-lg p-4">{fd.goalsNextPeriod}</p>
                    </div>
                )}
                {fd.trainingRecommended && (
                    <div>
                        <SectionTitle>Training Recommended</SectionTitle>
                        <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{fd.trainingRecommended}</p>
                    </div>
                )}
            </div>

            {/* Promotion & Salary */}
            {(fd.promotionRecommendation || fd.salaryRevisionRecommendation) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fd.promotionRecommendation && (
                        <div>
                            <SectionTitle>Promotion Recommendation</SectionTitle>
                            <p className="text-sm text-text bg-purple/5 border border-purple/10 rounded-lg p-4">{fd.promotionRecommendation}</p>
                        </div>
                    )}
                    {fd.salaryRevisionRecommendation && (
                        <div>
                            <SectionTitle>Salary Revision Recommendation</SectionTitle>
                            <p className="text-sm text-text bg-purple/5 border border-purple/10 rounded-lg p-4">{fd.salaryRevisionRecommendation}</p>
                        </div>
                    )}
                </div>
            )}

            {fd.additionalHrRemarks && (
                <div>
                    <SectionTitle>HR Remarks</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{fd.additionalHrRemarks}</p>
                </div>
            )}

            {/* Signatures */}
            <div>
                <SectionTitle>Signatures</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Employee", date: fd.employeeSignedAt },
                        { label: "Manager", date: fd.managerSignedAt },
                        { label: "HR", date: fd.hrSignedAt },
                    ].map((s, i) => (
                        <div key={i} className="border border-border rounded-lg p-3 text-center">
                            <div className="text-[10px] font-bold text-text-3 uppercase mb-2">{s.label}</div>
                            {s.date ? (
                                <div>
                                    <Badge variant="success" size="sm">Signed</Badge>
                                    <p className="text-xs text-text-4 mt-1">{format(new Date(s.date), "dd MMM yyyy")}</p>
                                </div>
                            ) : (
                                <Badge variant="neutral" size="sm">Pending</Badge>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ReviewDetailView({ review }: ReviewDetailViewProps) {
    const formData = review.formData
    const isDaily = review.formType === "DAILY"
    const isMonthly = review.formType === "MONTHLY"
    const isLeaderMonthly = review.formType === "LEADER_MONTHLY"

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between bg-gradient-to-r from-accent/5 to-purple/5 border border-accent/10 rounded-xl p-5">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-text">
                            {review.employee?.firstName} {review.employee?.lastName}
                        </h3>
                        <Badge variant={
                            isDaily ? "default" :
                            isLeaderMonthly ? "success" :
                            isMonthly ? "neutral" :
                            review.formType === "SOURCE_ONE_MONTHLY" ? "info" :
                            review.formType === "SOURCE_ONE_APPRAISAL" ? "purple" :
                            "warning"
                        } size="sm">
                            {isLeaderMonthly ? "Leader Monthly" :
                             review.formType === "SOURCE_ONE_MONTHLY" ? "S1 Monthly Review" :
                             review.formType === "SOURCE_ONE_APPRAISAL" ? "S1 Appraisal" :
                             review.formType || "Legacy"}
                        </Badge>
                        {review.reviewType === "SELF" && (
                            <Badge variant="neutral" size="sm">Self Review</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-3">
                        {review.employee?.designation && <span>{review.employee.designation}</span>}
                        {review.employee?.department?.name && (
                            <Badge variant="neutral" size="sm">{review.employee.department.name}</Badge>
                        )}
                        <span>Reviewed: {format(new Date(review.reviewDate), "MMM d, yyyy")}</span>
                        {review.reviewPeriod && <span>Period: {review.reviewPeriod}</span>}
                    </div>
                    {review.reviewer && (
                        <div className="text-sm text-text-3 mt-1">
                            Reviewed by: <span className="font-medium text-text">{review.reviewer.firstName} {review.reviewer.lastName}</span>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className={cn(
                        "text-3xl font-extrabold",
                        review.rating >= 4 ? "text-success" : review.rating >= 3 ? "text-accent" : "text-warning"
                    )}>
                        {review.rating.toFixed(1)}
                    </div>
                    <div className="text-sm text-text-3">/ 5.0</div>
                </div>
            </div>

            {/* Form-specific content */}
            {isDaily && formData && <DailyDetail formData={formData} />}
            {isMonthly && formData && <MonthlyDetail formData={formData} />}
            {isLeaderMonthly && formData && <LeaderMonthlyDetail formData={formData} />}
            {review.formType === "SOURCE_ONE_MONTHLY" && formData && <SourceOneMonthlyDetail formData={formData} />}
            {review.formType === "SOURCE_ONE_APPRAISAL" && formData && <SourceOneAppraisalDetail formData={formData} />}

            {/* Legacy/generic fallback */}
            {!isDaily && !isMonthly && !isLeaderMonthly && review.formType !== "SOURCE_ONE_MONTHLY" && review.formType !== "SOURCE_ONE_APPRAISAL" && review.comments && (
                <div>
                    <SectionTitle>Comments</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{review.comments}</p>
                </div>
            )}
        </div>
    )
}
