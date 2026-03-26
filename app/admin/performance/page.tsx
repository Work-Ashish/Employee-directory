"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { canAccessModule, Module } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

interface Alert {
    id: string
    employeeName: string
    avatarUrl: string | null
    designation: string
    department: string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    reason: string
    createdAt: string
}

interface Score {
    id: string
    employeeName: string
    avatarUrl: string | null
    designation: string
    department?: string
    baseScore: number
    aiAdjustment: number
    finalScore: number
    burnoutRisk: boolean
    behavioralAnomaly: boolean
    weekStartDate: string
}

const SEVERITY_BADGE_VARIANT: Record<string, "info" | "warning" | "danger"> = {
    LOW: "info",
    MEDIUM: "warning",
    HIGH: "danger",
    CRITICAL: "danger",
}

const SEVERITY_COLORS = {
    LOW: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
    MEDIUM: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
    HIGH: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
    CRITICAL: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
}

export default function PerformanceAdminDashboard() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [scores, setScores] = useState<Score[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading && !canAccessModule(user?.role ?? "", Module.PERFORMANCE)) {
            router.push("/")
        }
    }, [user, authLoading, router])

    useEffect(() => {
        api.get('/performance/metrics/')
            .then((resJson: any) => {
                const data = resJson.data || resJson
                setAlerts(data.alerts || [])
                setScores(data.scores || [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (authLoading || !canAccessModule(user?.role ?? "", Module.PERFORMANCE)) return null

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" className="text-emerald-500" />
            </div>
        )
    }

    const burnoutCount = alerts.filter(a => a.reason.includes("Burnout")).length
    const avgScore = scores.length ? (scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length).toFixed(1) : 0

    return (
        <div className="max-w-[1200px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <PageHeader
                title="AI Performance Matrix"
                description="Autonomous oversight of organization productivity and health."
                actions={
                    <Button
                        onClick={() => alert("Dispatching AI Agent Evaluation Matrix... Please wait.")}
                        leftIcon={<span className="text-lg">✨</span>}
                    >
                        Run AI Evaluation
                    </Button>
                }
            />

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="hover:border-emerald-500/30 transition-colors">
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-500">{avgScore}</div>
                        <div className="text-base font-medium text-text-3 mt-1">Org Avg Score (Last 7 Days)</div>
                    </CardContent>
                </Card>
                <Card className="hover:border-red-500/30 transition-colors">
                    <CardContent>
                        <div className="text-3xl font-black text-red-500">{alerts.length}</div>
                        <div className="text-base font-medium text-text-3 mt-1">Active AI Alerts</div>
                    </CardContent>
                </Card>
                <Card className="hover:border-orange-500/30 transition-colors">
                    <CardContent>
                        <div className="text-3xl font-black text-orange-500">{burnoutCount}</div>
                        <div className="text-base font-medium text-text-3 mt-1">Burnout Risks Detected</div>
                    </CardContent>
                </Card>
                <Card className="hover:border-blue-500/30 transition-colors">
                    <CardContent>
                        <div className="text-3xl font-black text-blue-500">{scores.filter(s => s.finalScore >= 90).length}</div>
                        <div className="text-base font-medium text-text-3 mt-1">Top Performers ({'>'}{`90`})</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Alerts */}
                <div className="space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2 text-red-500 font-bold tracking-tight text-sm uppercase">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        Critical AI Escalations
                    </div>

                    {alerts.length === 0 ? (
                        <EmptyState
                            title="All clear!"
                            description="No employee anomalies detected this week."
                            className="border border-dashed border-border rounded-2xl"
                        />
                    ) : (
                        <div className="space-y-3">
                            {alerts.map(alert => {
                                const sc = SEVERITY_COLORS[alert.severity]
                                return (
                                    <div key={alert.id} className={cn("p-4 rounded-xl border flex flex-col gap-3", sc.bg, sc.border)}>
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                src={alert.avatarUrl}
                                                name={alert.employeeName}
                                                size="sm"
                                                className="border border-border"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-text truncate">{alert.employeeName}</div>
                                                <div className="text-xs text-text-3 truncate">{alert.designation}</div>
                                            </div>
                                            <Badge variant={SEVERITY_BADGE_VARIANT[alert.severity]} size="sm">
                                                {alert.severity}
                                            </Badge>
                                        </div>
                                        <div className="text-xs font-medium text-text-2 leading-relaxed">
                                            {alert.reason}
                                        </div>
                                        <div className="flex justify-end gap-2 mt-2">
                                            <Button variant="ghost" size="sm">Dismiss</Button>
                                            <Button variant="danger" size="sm">Intervene</Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Right Col: Performance Scores */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="text-sm font-bold text-text-2 uppercase tracking-tight">Recent Weekly Scores</div>

                    <Card>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-bg-2 text-text-3 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3">Employee</th>
                                    <th className="px-5 py-3 text-right">Base</th>
                                    <th className="px-5 py-3 text-right">AI Adj</th>
                                    <th className="px-5 py-3 text-right">Final</th>
                                    <th className="px-5 py-3">Flags</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {scores.map(score => (
                                    <tr key={score.id} className="hover:bg-bg-2/50 transition-colors">
                                        <td className="px-5 py-4 flex items-center gap-3">
                                            <Avatar
                                                src={score.avatarUrl}
                                                name={score.employeeName}
                                                size="xs"
                                            />
                                            <div>
                                                <div className="font-bold text-text">{score.employeeName}</div>
                                                <div className="text-xs text-text-3">{score.department}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-medium text-text-2">{score.baseScore}</td>
                                        <td className={cn("px-5 py-4 text-right font-bold", score.aiAdjustment > 0 ? "text-emerald-500" : score.aiAdjustment < 0 ? "text-red-500" : "text-text-3")}>
                                            {score.aiAdjustment > 0 ? "+" : ""}{score.aiAdjustment}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-bg border border-border font-bold text-text shadow-sm">
                                                {score.finalScore}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                {score.burnoutRisk && <span title="Burnout Risk" className="text-orange-500 cursor-help">🔥</span>}
                                                {score.behavioralAnomaly && <span title="Behavioral Anomaly" className="text-red-500 cursor-help">⚠️</span>}
                                                {!score.burnoutRisk && !score.behavioralAnomaly && <span className="text-text-3">-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {scores.length === 0 && (
                            <EmptyState
                                title="No evaluations yet"
                                description="No evaluations generated for this week yet."
                                className="py-12"
                            />
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}
