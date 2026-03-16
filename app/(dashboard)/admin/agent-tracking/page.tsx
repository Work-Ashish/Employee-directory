"use client"

import * as React from "react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { LaptopIcon, BarChartIcon, ClockIcon } from "@radix-ui/react-icons"
import { api } from "@/lib/api-client"

interface DashboardData {
    devices: { active: number; pending: number; suspended: number; uninstalled: number; total: number }
    today: { avgProductivity: number; totalActiveSeconds: number; totalIdleSeconds: number; totalKeystrokes: number; totalMouseClicks: number; snapshotCount: number; idleEventCount: number }
    topApps: { appName: string; totalSeconds: number; category: string }[]
    topWebsites: { domain: string; totalSeconds: number; category: string }[]
    staleDevices: { id: string; deviceName: string; employeeName: string; lastHeartbeat: string | null }[]
}

interface Device {
    id: string
    deviceName: string
    platform: string
    status: string
    agentVersion: string
    lastHeartbeat: string | null
    createdAt: string
    employee: { id: string; firstName: string; lastName: string; employeeCode: string; designation: string }
}

function formatSeconds(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
}

const statusColors: Record<string, "success" | "warning" | "danger" | "neutral"> = {
    ACTIVE: "success",
    PENDING: "warning",
    SUSPENDED: "danger",
    UNINSTALLED: "neutral",
}

export default function AgentTrackingPage() {
    const [tab, setTab] = React.useState("dashboard")
    const [dashboard, setDashboard] = React.useState<DashboardData | null>(null)
    const [devices, setDevices] = React.useState<Device[]>([])
    const [deviceTotal, setDeviceTotal] = React.useState(0)
    const [loading, setLoading] = React.useState(true)
    const [statusFilter, setStatusFilter] = React.useState("")
    const [search, setSearch] = React.useState("")
    const [page, setPage] = React.useState(1)

    const fetchDashboard = React.useCallback(async () => {
        try {
            const { data } = await api.get<DashboardData>('/admin/agent/dashboard/')
            setDashboard(data)
        } catch (err) {
            console.error("Dashboard fetch error:", err)
        }
    }, [])

    const fetchDevices = React.useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: "20" })
            if (statusFilter) params.set("status", statusFilter)
            if (search) params.set("search", search)

            const { data } = await api.get<{ data: Device[]; meta?: { total: number } }>('/admin/agent/devices/?' + params)
            setDevices(data?.data || [])
            setDeviceTotal(data?.meta?.total || 0)
        } catch (err) {
            console.error("Devices fetch error:", err)
        }
    }, [page, statusFilter, search])

    React.useEffect(() => {
        setLoading(true)
        Promise.all([fetchDashboard(), fetchDevices()]).finally(() => setLoading(false))
    }, [fetchDashboard, fetchDevices])

    const handleDeviceAction = async (deviceId: string, status: "ACTIVE" | "SUSPENDED") => {
        await api.post('/admin/agent/devices/', { deviceId, status })
        fetchDevices()
    }

    const handleCommand = async (deviceId: string, type: string) => {
        if (!confirm(`Are you sure you want to issue ${type} command?`)) return
        await api.post('/admin/agent/command/', { deviceId, type })
        fetchDevices()
    }

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader title="Agent Tracking" description="Monitor and manage desktop agent devices, productivity, and commands." />

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="devices">Devices</TabsTrigger>
                    <TabsTrigger value="commands">Commands</TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Array(4).fill(0).map((_, i) => <div key={i} className="h-[120px] bg-surface border border-border rounded-xl animate-pulse" />)}
                        </div>
                    ) : dashboard && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Active Devices" value={dashboard.devices.active} icon={<LaptopIcon className="w-4 h-4" />} change={{ value: `${dashboard.devices.total} total`, positive: true }} />
                                <StatCard label="Avg Productivity" value={`${Math.round(dashboard.today.avgProductivity * 100)}%`} icon={<BarChartIcon className="w-4 h-4" />} />
                                <StatCard label="Active Time Today" value={formatSeconds(dashboard.today.totalActiveSeconds)} icon={<ClockIcon className="w-4 h-4" />} />
                                <StatCard label="Idle Events" value={dashboard.today.idleEventCount} icon={<ClockIcon className="w-4 h-4" />} change={{ value: `${dashboard.today.snapshotCount} snapshots` }} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Apps */}
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Top Applications</CardTitle></CardHeader>
                                    <CardContent>
                                        {dashboard.topApps.length === 0 ? (
                                            <p className="text-sm text-text-3">No app data for today.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {dashboard.topApps.map((app, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{app.appName}</span>
                                                            <Badge variant="neutral" size="sm">{app.category}</Badge>
                                                        </div>
                                                        <span className="text-sm font-mono text-text-3">{formatSeconds(app.totalSeconds)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Top Websites */}
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Top Websites</CardTitle></CardHeader>
                                    <CardContent>
                                        {dashboard.topWebsites.length === 0 ? (
                                            <p className="text-sm text-text-3">No website data for today.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {dashboard.topWebsites.map((site, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{site.domain}</span>
                                                            <Badge variant="neutral" size="sm">{site.category}</Badge>
                                                        </div>
                                                        <span className="text-sm font-mono text-text-3">{formatSeconds(site.totalSeconds)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stale Devices */}
                            {dashboard.staleDevices.length > 0 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-base text-warning">Stale Devices (No heartbeat 10+ min)</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {dashboard.staleDevices.map(d => (
                                                <div key={d.id} className="flex items-center justify-between p-3 bg-warning/5 rounded-lg border border-warning/20">
                                                    <div>
                                                        <span className="text-sm font-medium">{d.employeeName}</span>
                                                        <span className="text-xs text-text-3 ml-2">{d.deviceName}</span>
                                                    </div>
                                                    <span className="text-xs text-text-4">{d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleTimeString() : "Never"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* Devices Tab */}
                <TabsContent value="devices">
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Input placeholder="Search devices or employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="max-w-xs" />
                            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                                <option value="">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING">Pending</option>
                                <option value="SUSPENDED">Suspended</option>
                                <option value="UNINSTALLED">Uninstalled</option>
                            </Select>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-bg-2/50">
                                                <th className="px-4 py-3 text-left font-semibold text-text-3">Employee</th>
                                                <th className="px-4 py-3 text-left font-semibold text-text-3">Device</th>
                                                <th className="px-4 py-3 text-left font-semibold text-text-3">Platform</th>
                                                <th className="px-4 py-3 text-left font-semibold text-text-3">Version</th>
                                                <th className="px-4 py-3 text-left font-semibold text-text-3">Status</th>
                                                <th className="px-4 py-3 text-left font-semibold text-text-3">Last Heartbeat</th>
                                                <th className="px-4 py-3 text-right font-semibold text-text-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {devices.map(d => (
                                                <tr key={d.id} className="border-b border-border/50 hover:bg-bg-2/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{d.employee.firstName} {d.employee.lastName}</div>
                                                        <div className="text-xs text-text-3">{d.employee.employeeCode}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-text-2">{d.deviceName}</td>
                                                    <td className="px-4 py-3 capitalize">{d.platform}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{d.agentVersion}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={statusColors[d.status] || "neutral"} size="sm" dot>{d.status}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-text-3">
                                                        {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            {d.status === "PENDING" && (
                                                                <Button size="sm" variant="primary" onClick={() => handleDeviceAction(d.id, "ACTIVE")}>Approve</Button>
                                                            )}
                                                            {d.status === "ACTIVE" && (
                                                                <Button size="sm" variant="secondary" onClick={() => handleDeviceAction(d.id, "SUSPENDED")}>Suspend</Button>
                                                            )}
                                                            {d.status === "SUSPENDED" && (
                                                                <Button size="sm" variant="primary" onClick={() => handleDeviceAction(d.id, "ACTIVE")}>Resume</Button>
                                                            )}
                                                            {d.status === "ACTIVE" && (
                                                                <Button size="sm" variant="danger" onClick={() => handleCommand(d.id, "KILL_SWITCH")}>Kill Switch</Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {devices.length === 0 && !loading && (
                                                <tr><td colSpan={7} className="px-4 py-12 text-center text-text-3">No devices found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {deviceTotal > 20 && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-text-3">{deviceTotal} devices total</span>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                                    <Button size="sm" variant="secondary" disabled={page * 20 >= deviceTotal} onClick={() => setPage(p => p + 1)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Commands Tab */}
                <TabsContent value="commands">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Command Center</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-text-3 mb-4">
                                Issue commands to individual devices from the Devices tab. Available commands:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { type: "SUSPEND", desc: "Temporarily disable the agent. No data collection." },
                                    { type: "RESUME", desc: "Re-enable a suspended agent." },
                                    { type: "KILL_SWITCH", desc: "Immediately suspend + block all API access." },
                                    { type: "UNINSTALL", desc: "Request agent to uninstall itself from the device." },
                                    { type: "WIPE_DATA", desc: "Instruct agent to delete all local cached data." },
                                    { type: "FORCE_SYNC", desc: "Force the agent to upload all pending data now." },
                                    { type: "FORCE_UPDATE", desc: "Request agent to update to the latest version." },
                                    { type: "UPDATE_CONFIG", desc: "Push new configuration to the agent." },
                                ].map(cmd => (
                                    <div key={cmd.type} className="p-3 border border-border rounded-lg">
                                        <div className="text-sm font-semibold font-mono">{cmd.type}</div>
                                        <div className="text-xs text-text-3 mt-1">{cmd.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
