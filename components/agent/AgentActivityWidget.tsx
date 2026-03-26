"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { LaptopIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { api } from "@/lib/api-client"

interface WidgetData {
    productivityScore: number
    totalActiveSeconds: number
    totalIdleSeconds: number
    topApps: { appName: string; totalSeconds: number }[]
    topWebsites: { domain: string; totalSeconds: number }[]
    date: string
}

function formatTime(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function AgentActivityWidget() {
    const [data, setData] = React.useState<WidgetData | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const todayStr = today.toISOString().split("T")[0]
        const yesterdayStr = yesterday.toISOString().split("T")[0]

        const fetchReport = (dateStr: string) =>
            api.get<WidgetData>(`/agent/daily-report/?date=${dateStr}`).then(({ data }) => {
                if (data) {
                    setData({
                        productivityScore: data.productivityScore ?? 0,
                        totalActiveSeconds: data.totalActiveSeconds ?? 0,
                        totalIdleSeconds: data.totalIdleSeconds ?? 0,
                        topApps: (data.topApps || []).slice(0, 3),
                        topWebsites: (data.topWebsites || []).slice(0, 3),
                        date: dateStr,
                    })
                }
            })

        // Try today first; if blocked (before 8 PM), fall back to yesterday
        fetchReport(todayStr)
            .catch(() => fetchReport(yesterdayStr).catch(() => {}))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <div className="h-[200px] bg-surface border border-border rounded-2xl animate-pulse" />
    }

    if (!data) return null

    const score = Math.round((data?.productivityScore || 0) * 100)
    const scoreColor = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-danger"

    return (
        <Card variant="glass-premium" className="rounded-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center text-purple">
                            <LaptopIcon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">Activity Tracker</CardTitle>
                    </div>
                    <Badge variant="neutral" size="sm">Today</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-6 mb-4">
                    {/* Productivity Score Circle */}
                    <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none" stroke="currentColor" className="text-bg-3" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none" className={scoreColor} stroke="currentColor"
                                strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-lg font-extrabold ${scoreColor}`}>{score}%</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-3">Active</span>
                            <span className="font-semibold text-success">{formatTime(data.totalActiveSeconds)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-3">Idle</span>
                            <span className="font-semibold text-warning">{formatTime(data.totalIdleSeconds)}</span>
                        </div>
                    </div>
                </div>

                {/* Top 3 Apps */}
                {data.topApps.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                        <span className="text-xs font-semibold text-text-4 uppercase tracking-wider">Top Apps</span>
                        {data.topApps.map((app, i) => (
                            <div key={i} className="flex justify-between text-xs">
                                <span className="text-text-2 truncate">{app.appName}</span>
                                <span className="text-text-3 font-mono">{formatTime(app.totalSeconds)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <Link href={`/reports/daily-activity?date=${data.date}`}
                    className="block text-center text-xs font-semibold text-accent hover:underline mt-3">
                    View Full Report
                </Link>
            </CardContent>
        </Card>
    )
}
