"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/api-client"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"
import { EmptyState } from "@/components/ui/EmptyState"
import { LaptopIcon, DownloadIcon, ClockIcon, BarChartIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"

interface DailyReport {
    date: string
    activeSeconds: number
    idleSeconds: number
    totalSeconds: number
    productiveSeconds: number
    unproductiveSeconds: number
    neutralSeconds: number
    keystrokes: number
    mouseClicks: number
    screenshotCount: number
    topApps: { appName: string; totalSeconds: number; category: string }[]
    topWebsites: { domain: string; totalSeconds: number; category: string }[]
    idleEvents: number
    productivity: number
    clockIn: string | null
    clockOut: string | null
}

interface DeviceInfo {
    id: string
    deviceName: string
    platform: string
    status: string
    lastHeartbeat: string | null
}

function formatSeconds(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getProductivityColor(pct: number): string {
    if (pct >= 80) return "text-success"
    if (pct >= 50) return "text-warning"
    return "text-danger"
}

export default function EmployeeTimeAgentPage() {
    const { user } = useAuth()
    const [loading, setLoading] = React.useState(true)
    const [device, setDevice] = React.useState<DeviceInfo | null>(null)
    const [reports, setReports] = React.useState<DailyReport[]>([])

    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true)

            // Get employee's own device — use employee-scoped endpoint, not admin
            try {
                const { data: devicesData } = await api.get<any>('/agent/devices/?limit=1')
                const devices = devicesData?.data || devicesData?.results || []
                if (devices.length > 0) {
                    const d = devices[0]
                    setDevice({
                        id: d.id,
                        deviceName: d.deviceName || d.device_name || "",
                        platform: d.platform || "",
                        status: d.status || "",
                        lastHeartbeat: d.lastHeartbeat || d.last_heartbeat || null,
                    })
                }
            } catch (err) {
                console.warn("[TimeAgent] Could not fetch device info:", err)
            }

            // Fetch last 7 days of daily reports in parallel
            const dayPromises = Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (i + 1))
                const dateStr = d.toISOString().split("T")[0]
                return api.get<any>(`/agent/daily-report/?date=${dateStr}`)
                    .then(({ data }) => {
                        if (!data) return null
                        return {
                            date: data.date || dateStr,
                            activeSeconds: data.activeSeconds ?? data.active_seconds ?? 0,
                            idleSeconds: data.idleSeconds ?? data.idle_seconds ?? 0,
                            totalSeconds: data.totalSeconds ?? data.total_seconds ?? 0,
                            productiveSeconds: data.productiveSeconds ?? data.productive_seconds ?? 0,
                            unproductiveSeconds: data.unproductiveSeconds ?? data.unproductive_seconds ?? 0,
                            neutralSeconds: data.neutralSeconds ?? data.neutral_seconds ?? 0,
                            keystrokes: data.keystrokeCount ?? data.keystroke_count ?? 0,
                            mouseClicks: data.mouseClickCount ?? data.mouse_click_count ?? 0,
                            screenshotCount: data.screenshotCount ?? data.screenshot_count ?? 0,
                            topApps: (data.topApps || data.top_apps || []).map((a: any) => ({
                                appName: a.appName || a.app_name || "",
                                totalSeconds: a.totalSeconds || a.total_seconds || 0,
                                category: a.category || "UNCATEGORIZED",
                            })),
                            topWebsites: (data.topWebsites || data.top_websites || []).map((w: any) => ({
                                domain: w.domain || "",
                                totalSeconds: w.totalSeconds || w.total_seconds || 0,
                                category: w.category || "UNCATEGORIZED",
                            })),
                            idleEvents: data.idleEventCount ?? data.idle_event_count ?? 0,
                            productivity: Math.round(data.productivityScore ?? data.productivity_score ?? 0),
                            clockIn: data.clockIn || data.clock_in || null,
                            clockOut: data.clockOut || data.clock_out || null,
                        } as DailyReport
                    })
                    .catch(() => null)
            })
            const dayResults = await Promise.all(dayPromises)
            const fetchedReports: DailyReport[] = dayResults.filter((r): r is DailyReport => r !== null)

            // Also try today's report (will fail with 400 if before 8 PM, which is fine)
            try {
                const todayStr = new Date().toISOString().split("T")[0]
                const { data } = await api.get<any>(`/agent/daily-report/?date=${todayStr}`)
                if (data) {
                    fetchedReports.unshift({
                        date: data.date || todayStr,
                        activeSeconds: data.activeSeconds ?? data.active_seconds ?? 0,
                        idleSeconds: data.idleSeconds ?? data.idle_seconds ?? 0,
                        totalSeconds: data.totalSeconds ?? data.total_seconds ?? 0,
                        productiveSeconds: data.productiveSeconds ?? data.productive_seconds ?? 0,
                        unproductiveSeconds: data.unproductiveSeconds ?? data.unproductive_seconds ?? 0,
                        neutralSeconds: data.neutralSeconds ?? data.neutral_seconds ?? 0,
                        keystrokes: data.keystrokeCount ?? data.keystroke_count ?? 0,
                        mouseClicks: data.mouseClickCount ?? data.mouse_click_count ?? 0,
                        screenshotCount: data.screenshotCount ?? data.screenshot_count ?? 0,
                        topApps: (data.topApps || data.top_apps || []).map((a: any) => ({
                            appName: a.appName || a.app_name || "",
                            totalSeconds: a.totalSeconds || a.total_seconds || 0,
                            category: a.category || "UNCATEGORIZED",
                        })),
                        topWebsites: (data.topWebsites || data.top_websites || []).map((w: any) => ({
                            domain: w.domain || "",
                            totalSeconds: w.totalSeconds || w.total_seconds || 0,
                            category: w.category || "UNCATEGORIZED",
                        })),
                        idleEvents: data.idleEventCount ?? data.idle_event_count ?? 0,
                        productivity: Math.round(data.productivityScore ?? data.productivity_score ?? 0),
                        clockIn: data.clockIn || data.clock_in || null,
                        clockOut: data.clockOut || data.clock_out || null,
                    })
                }
            } catch {
                // Today's report not available yet — expected before 8 PM
            }

            setReports(fetchedReports)
        } catch (err) {
            console.error("[TimeAgent] Failed to fetch activity data:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-2 text-text-3">
                <Spinner size="lg" /> Loading...
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-page-in max-w-4xl">
            <PageHeader
                title="Time Agent"
                description="Track your daily work activity automatically"
            />

            {/* Download Section */}
            <Card className="p-6 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white rounded-xl overflow-hidden relative">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <LaptopIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">EMS Time Agent</h2>
                            <p className="text-sm text-white/70">Desktop productivity tracker</p>
                        </div>
                    </div>
                    <p className="text-sm text-white/80 mb-4 max-w-lg">
                        Download and install the Time Agent on your computer. It runs in the background and tracks your daily work activity, app usage, and active hours. Reports are generated daily at 8:00 PM.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            className="bg-white text-[#007aff] hover:bg-white/90 font-semibold"
                            leftIcon={<DownloadIcon className="w-4 h-4" />}
                            onClick={() => {
                                // In production, this would link to the actual installer
                                window.open('/downloads/time-agent-setup.exe', '_blank')
                            }}
                        >
                            Download for Windows
                        </Button>
                        <Button
                            variant="secondary"
                            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                            onClick={() => {
                                window.open('/downloads/time-agent.dmg', '_blank')
                            }}
                        >
                            Download for macOS
                        </Button>
                    </div>
                </div>
                <div className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] bg-white/10 rounded-full blur-[40px]" />
                <div className="absolute right-[40px] bottom-[20px] text-[80px] opacity-10">⏱</div>
            </Card>

            {/* Device Status */}
            {device && (
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                <LaptopIcon className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-text">{device.deviceName}</div>
                                <div className="text-xs text-text-3">{device.platform} &middot; {device.lastHeartbeat ? `Last seen ${format(new Date(device.lastHeartbeat), "h:mm a")}` : "Never connected"}</div>
                            </div>
                        </div>
                        <Badge
                            variant={device.status === "ACTIVE" ? "success" : device.status === "PENDING" ? "warning" : "neutral"}
                            dot
                        >
                            {device.status}
                        </Badge>
                    </div>
                </Card>
            )}

            {/* Daily Reports */}
            <div>
                <h2 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-accent" />
                    Daily Reports
                </h2>
                <p className="text-sm text-text-3 mb-4">Reports are generated daily at 8:00 PM. You cannot view live tracking data.</p>

                {reports.length === 0 ? (
                    <EmptyState
                        icon={<span className="text-[40px]">📊</span>}
                        title="No reports available yet"
                        description={new Date().getHours() < 20
                            ? "Today's report will be available after 8:00 PM"
                            : "Install the Time Agent to start generating daily reports"
                        }
                        className="border-2 border-dashed border-border rounded-2xl bg-surface py-12"
                    />
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <Card key={report.date} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">
                                            {format(new Date(report.date), "EEEE, MMMM d, yyyy")}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {report.clockIn && (
                                                <span className="text-xs text-text-3">
                                                    {format(new Date(report.clockIn), "h:mm a")} - {report.clockOut ? format(new Date(report.clockOut), "h:mm a") : "..."}
                                                </span>
                                            )}
                                            <Badge variant={report.productivity >= 70 ? "success" : report.productivity >= 40 ? "warning" : "danger"}>
                                                {report.productivity}% Productive
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-bg-2 rounded-lg p-3 text-center">
                                            <div className="text-xs text-text-3 mb-1">Active Time</div>
                                            <div className="text-lg font-bold text-text">{formatSeconds(report.activeSeconds)}</div>
                                        </div>
                                        <div className="bg-bg-2 rounded-lg p-3 text-center">
                                            <div className="text-xs text-text-3 mb-1">Idle Time</div>
                                            <div className="text-lg font-bold text-text">{formatSeconds(report.idleSeconds)}</div>
                                        </div>
                                        <div className="bg-bg-2 rounded-lg p-3 text-center">
                                            <div className="text-xs text-text-3 mb-1">Keystrokes</div>
                                            <div className="text-lg font-bold text-text">{report.keystrokes.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-bg-2 rounded-lg p-3 text-center">
                                            <div className="text-xs text-text-3 mb-1">Mouse Clicks</div>
                                            <div className="text-lg font-bold text-text">{report.mouseClicks.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Productivity breakdown bar */}
                                    {report.totalSeconds > 0 && (
                                        <div className="mb-4">
                                            <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">Time Breakdown</div>
                                            <div className="flex h-3 rounded-full overflow-hidden bg-bg-2">
                                                {report.productiveSeconds > 0 && (
                                                    <div
                                                        className="bg-success"
                                                        style={{ width: `${(report.productiveSeconds / report.totalSeconds) * 100}%` }}
                                                        title={`Productive: ${formatSeconds(report.productiveSeconds)}`}
                                                    />
                                                )}
                                                {report.neutralSeconds > 0 && (
                                                    <div
                                                        className="bg-accent"
                                                        style={{ width: `${(report.neutralSeconds / report.totalSeconds) * 100}%` }}
                                                        title={`Neutral: ${formatSeconds(report.neutralSeconds)}`}
                                                    />
                                                )}
                                                {report.unproductiveSeconds > 0 && (
                                                    <div
                                                        className="bg-danger"
                                                        style={{ width: `${(report.unproductiveSeconds / report.totalSeconds) * 100}%` }}
                                                        title={`Unproductive: ${formatSeconds(report.unproductiveSeconds)}`}
                                                    />
                                                )}
                                                {report.idleSeconds > 0 && (
                                                    <div
                                                        className="bg-border"
                                                        style={{ width: `${(report.idleSeconds / report.totalSeconds) * 100}%` }}
                                                        title={`Idle: ${formatSeconds(report.idleSeconds)}`}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-1.5 text-xs text-text-3">
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> Productive</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Neutral</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" /> Unproductive</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-border inline-block" /> Idle</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats row */}
                                    <div className="flex gap-4 mb-4 text-xs text-text-3">
                                        <span>Screenshots: {report.screenshotCount}</span>
                                        <span>Idle alerts: {report.idleEvents}</span>
                                    </div>

                                    {/* Top Apps */}
                                    {report.topApps.length > 0 && (
                                        <div className="mb-4">
                                            <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">Top Applications</div>
                                            <div className="space-y-2">
                                                {report.topApps.slice(0, 5).map((app, i) => {
                                                    const pct = report.activeSeconds > 0 ? Math.round((app.totalSeconds / report.activeSeconds) * 100) : 0
                                                    return (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm font-medium text-text truncate">{app.appName}</span>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <Badge
                                                                            variant={app.category === "PRODUCTIVE" ? "success" : app.category === "UNPRODUCTIVE" ? "danger" : "neutral"}
                                                                            size="sm"
                                                                        >
                                                                            {app.category}
                                                                        </Badge>
                                                                        <span className="text-xs font-mono text-text-3">{formatSeconds(app.totalSeconds)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${app.category === "PRODUCTIVE" ? "bg-success" : app.category === "UNPRODUCTIVE" ? "bg-danger" : "bg-accent"}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Websites */}
                                    {report.topWebsites && report.topWebsites.length > 0 && (
                                        <div>
                                            <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">Top Websites</div>
                                            <div className="space-y-2">
                                                {report.topWebsites.slice(0, 5).map((site, i) => {
                                                    const pct = report.activeSeconds > 0 ? Math.round((site.totalSeconds / report.activeSeconds) * 100) : 0
                                                    return (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm font-medium text-text truncate">{site.domain}</span>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <Badge
                                                                            variant={site.category === "PRODUCTIVE" ? "success" : site.category === "UNPRODUCTIVE" ? "danger" : "neutral"}
                                                                            size="sm"
                                                                        >
                                                                            {site.category}
                                                                        </Badge>
                                                                        <span className="text-xs font-mono text-text-3">{formatSeconds(site.totalSeconds)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${site.category === "PRODUCTIVE" ? "bg-success" : site.category === "UNPRODUCTIVE" ? "bg-danger" : "bg-accent"}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* How it works */}
            <Card className="p-5">
                <h3 className="text-sm font-bold text-text mb-3">How it works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">1</div>
                        <div>
                            <div className="font-semibold text-text">Install Agent</div>
                            <div className="text-text-3">Download and install the Time Agent on your work computer</div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">2</div>
                        <div>
                            <div className="font-semibold text-text">Work Normally</div>
                            <div className="text-text-3">The agent runs silently in the system tray tracking your activity</div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">3</div>
                        <div>
                            <div className="font-semibold text-text">View Reports</div>
                            <div className="text-text-3">Check your daily reports here every day after 8:00 PM</div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
