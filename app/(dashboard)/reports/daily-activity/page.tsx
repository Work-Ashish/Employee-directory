"use client"

import * as React from "react"
import { Suspense } from "react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { BarChartIcon, ClockIcon, LaptopIcon } from "@radix-ui/react-icons"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api-client"
import { Spinner } from "@/components/ui/Spinner"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, Module } from "@/lib/permissions"

interface Report {
    id: string
    date: string
    totalActiveSeconds: number
    totalIdleSeconds: number
    totalBreakSeconds: number
    productivityScore: number
    focusScore: number
    totalSessionSeconds: number
    snapshotCount: number
    idleEventCount: number
    topApps: { appName: string; totalSeconds: number; category: string }[]
    topWebsites: { domain: string; totalSeconds: number; category: string }[]
    aiSummary: string | null
    aiRecommendations: string | null
    emailSentAt: string | null
}

function formatTime(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
}

function DailyActivityReportContent() {
    const searchParams = useSearchParams()
    const [date, setDate] = React.useState(searchParams.get("date") || new Date().toISOString().split("T")[0])
    const [report, setReport] = React.useState<Report | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    const fetchReport = React.useCallback(async (d: string) => {
        setLoading(true)
        setError("")
        try {
            const { data } = await api.get<Report>('/agent/report/' + d + '/')
            setReport(data)
        } catch (err: any) {
            if (err?.status === 404) {
                setReport(null)
                setError("No report available for this date.")
            } else {
                setError("Failed to load report.")
            }
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchReport(date)
    }, [date, fetchReport])

    return (
        <div className="space-y-6 animate-page-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader title="Daily Activity Report" description="AI-powered insights from your desktop agent." />
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="max-w-[200px]" />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-[120px] bg-surface border border-border rounded-xl animate-pulse" />)}
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-text-3">{error}</p>
                    </CardContent>
                </Card>
            ) : report && (
                <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Active Time" value={formatTime(report.totalActiveSeconds)} icon={<ClockIcon className="w-4 h-4" />} />
                        <StatCard label="Idle Time" value={formatTime(report.totalIdleSeconds)} icon={<ClockIcon className="w-4 h-4" />} />
                        <StatCard label="Productivity" value={`${Math.round(report.productivityScore * 100)}%`} icon={<BarChartIcon className="w-4 h-4" />}
                            change={{ value: `Focus: ${Math.round(report.focusScore * 100)}%`, positive: report.focusScore > 0.5 }} />
                        <StatCard label="Snapshots" value={report.snapshotCount} icon={<LaptopIcon className="w-4 h-4" />}
                            change={{ value: `${report.idleEventCount} idle events` }} />
                    </div>

                    {/* Time Breakdown Bar */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Time Breakdown</CardTitle></CardHeader>
                        <CardContent>
                            {(() => {
                                const total = report.totalActiveSeconds + report.totalIdleSeconds + report.totalBreakSeconds
                                const activePct = total > 0 ? (report.totalActiveSeconds / total) * 100 : 0
                                const idlePct = total > 0 ? (report.totalIdleSeconds / total) * 100 : 0
                                const breakPct = total > 0 ? (report.totalBreakSeconds / total) * 100 : 0
                                return (
                                    <div>
                                        <div className="flex h-6 rounded-full overflow-hidden bg-bg-3">
                                            <div className="bg-success transition-all" style={{ width: `${activePct}%` }} title={`Active: ${activePct.toFixed(1)}%`} />
                                            <div className="bg-warning transition-all" style={{ width: `${idlePct}%` }} title={`Idle: ${idlePct.toFixed(1)}%`} />
                                            <div className="bg-info transition-all" style={{ width: `${breakPct}%` }} title={`Break: ${breakPct.toFixed(1)}%`} />
                                        </div>
                                        <div className="flex gap-4 mt-2 text-xs">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Active {activePct.toFixed(0)}%</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Idle {idlePct.toFixed(0)}%</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-info" /> Break {breakPct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )
                            })()}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Apps */}
                        <Card>
                            <CardHeader><CardTitle className="text-base">Top Applications</CardTitle></CardHeader>
                            <CardContent>
                                {(report.topApps || []).length === 0 ? (
                                    <p className="text-sm text-text-3">No app data.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {report.topApps.map((app, i) => {
                                            const maxSec = report.topApps[0]?.totalSeconds || 1
                                            const pct = (app.totalSeconds / maxSec) * 100
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{app.appName}</span>
                                                            <Badge variant="neutral" size="sm">{app.category}</Badge>
                                                        </div>
                                                        <span className="text-xs font-mono text-text-3">{formatTime(app.totalSeconds)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
                                                        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Websites */}
                        <Card>
                            <CardHeader><CardTitle className="text-base">Top Websites</CardTitle></CardHeader>
                            <CardContent>
                                {(report.topWebsites || []).length === 0 ? (
                                    <p className="text-sm text-text-3">No website data.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {report.topWebsites.map((site, i) => {
                                            const maxSec = report.topWebsites[0]?.totalSeconds || 1
                                            const pct = (site.totalSeconds / maxSec) * 100
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{site.domain}</span>
                                                            <Badge variant="neutral" size="sm">{site.category}</Badge>
                                                        </div>
                                                        <span className="text-xs font-mono text-text-3">{formatTime(site.totalSeconds)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Insights */}
                    {report.aiSummary && (
                        <Card className="border-accent/20">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <span className="text-lg">&#x2728;</span> AI Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-text-2 leading-relaxed mb-3">{report.aiSummary}</p>
                                {report.aiRecommendations && report.aiRecommendations.trim().length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2">Recommendations</h4>
                                        <ul className="space-y-1">
                                            {report.aiRecommendations.split("\n").filter(Boolean).map((rec, i) => (
                                                <li key={i} className="text-sm text-text-2 flex items-start gap-2">
                                                    <span className="text-accent mt-0.5">&#x2022;</span>
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {report.emailSentAt && (
                                    <p className="text-xs text-text-4 mt-4">Email sent at {new Date(report.emailSentAt).toLocaleString()}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}

export default function DailyActivityReportPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.REPORTS)) router.push("/") }, [user, isLoading, router])

    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20 gap-2 text-text-3"><Spinner size="lg" /> Loading...</div>}>
            <DailyActivityReportContent />
        </Suspense>
    )
}
