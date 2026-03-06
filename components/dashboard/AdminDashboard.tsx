import * as React from "react"
import { extractArray, cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts"
import { DashboardStatCard, DeptRow, HireRow } from "./DashboardComponents"
import { tooltipStyle, axisStyle, chartColors } from "@/lib/chart-theme"

export function AdminDashboard() {
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<any>(null)
    const [loginData, setLoginData] = React.useState<any>(null)
    const [selectedDept, setSelectedDept] = React.useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null)
    const [reportLoading, setReportLoading] = React.useState(false)
    const [reportData, setReportData] = React.useState<string | null>(null)
    const isFirstLoad = React.useRef(true)

    const fetchDashboardData = React.useCallback(async () => {
        try {
            if (isFirstLoad.current) setLoading(true)
            const [dashRes, loginRes] = await Promise.all([
                fetch("/api/dashboard", { cache: "no-store" }),
                fetch("/api/dashboard/logins", { cache: "no-store" }),
            ])
            if (dashRes.ok) {
                const dashJson = await dashRes.json()
                setData(dashJson.data || (typeof dashJson === "object" && !Array.isArray(dashJson) ? dashJson : null))
            } else {
                const errorJson = await dashRes.json().catch(() => ({}))
                console.error("Dashboard API error:", dashRes.status, errorJson.error?.message || dashRes.statusText)
            }
            if (loginRes.ok) {
                const loginJson = await loginRes.json()
                setLoginData(loginJson.data || (typeof loginJson === "object" && !Array.isArray(loginJson) ? loginJson : null))
            } else {
                const errorJson = await loginRes.json().catch(() => ({}))
                console.error("Login API error:", loginRes.status, errorJson.error?.message || loginRes.statusText)
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error)
        } finally {
            isFirstLoad.current = false
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDashboardData()
        let interval: NodeJS.Timeout | null = null
        const startPolling = () => {
            if (interval) clearInterval(interval)
            interval = setInterval(fetchDashboardData, 30000)
        }
        const handleVisibility = () => {
            if (document.hidden) {
                if (interval) clearInterval(interval)
                interval = null
            } else {
                fetchDashboardData()
                startPolling()
            }
        }
        startPolling()
        document.addEventListener("visibilitychange", handleVisibility)
        return () => {
            if (interval) clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [fetchDashboardData])

    const generateReport = async () => {
        setReportLoading(true)
        try {
            const res = await fetch("/api/admin/analytics/burnout")
            if (res.ok) {
                const json = await res.json()
                setReportData(json.report || "No data found")
            } else {
                setReportData("Error generating report.")
            }
        } catch (error) {
            console.error(error)
            setReportData("Failed to generate report.")
        } finally {
            setReportLoading(false)
        }
    }

    const deptData = extractArray(data?.deptSplit)
    const hiringData = extractArray(data?.hiringTrend)
    const salaryData = extractArray(data?.salaryRanges)
    const recentHires = extractArray(data?.recentHires)
    const filteredDepts = selectedDept ? deptData.filter((d: any) => d.name === selectedDept) : deptData
    const filteredHires = selectedDept ? recentHires.filter((h: any) => h.dept === selectedDept) : recentHires
    const selectedMonthData: any = selectedMonth ? hiringData.find((d: any) => d.month === selectedMonth) : null

    const greeting = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"

    return (
        <div className="space-y-5">
            {/* Report Modal */}
            <Modal isOpen={!!reportData} onClose={() => setReportData(null)} title="AI Team Health & Burnout Report">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-base text-text-2 leading-relaxed p-4 bg-surface-3 rounded-lg border border-border max-h-[60vh] overflow-y-auto">
                        {reportData}
                    </pre>
                </div>
            </Modal>

            {/* Hiring Month Modal */}
            <Modal isOpen={!!selectedMonth} onClose={() => setSelectedMonth(null)} title={`Hires in ${selectedMonth}`}>
                <div className="space-y-4">
                    <p className="text-sm text-text-3">Employees hired in {selectedMonth}.</p>
                    <div className="space-y-2">
                        {selectedMonthData?.details?.map((hire: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-3">
                                <div className="flex items-center gap-3">
                                    <Avatar name={hire.name} size="sm" />
                                    <div>
                                        <div className="text-sm font-semibold text-text">{hire.name}</div>
                                        <div className="text-xs text-text-3">{hire.role}</div>
                                    </div>
                                </div>
                                <Badge variant="success" size="sm">New</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Page Header */}
            <div className="flex items-center justify-between pb-1">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-text">
                        Good {greeting}, <span className="text-accent">Admin</span>
                    </h1>
                    <p className="text-sm text-text-3 mt-0.5">Here&apos;s what&apos;s happening with your team today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={generateReport}
                        loading={reportLoading}
                        className="bg-gradient-to-r from-purple to-accent border-0"
                    >
                        AI Team Health Report
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border shadow-xs">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                        </span>
                        <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Live</span>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-surface rounded-xl border border-border p-5 h-[130px] flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    ))
                ) : (
                    <>
                        <DashboardStatCard label="Total Employees" value={data?.stats?.totalEmployees?.toString() || "0"} sub="last month" badge="7%" badgeType="up" icon={<span>👥</span>} />
                        <DashboardStatCard label="Active Employees" value={data?.stats?.activeEmployees?.toString() || "0"} sub="last month" badge="5%" badgeType="up" icon={<span>✅</span>} />
                        <DashboardStatCard label="On Leave" value={data?.stats?.onLeaveEmployees?.toString() || "0"} sub="last month" badge="4%" badgeType="up" icon={<span>🌴</span>} />
                        <DashboardStatCard label="Monthly Payroll" value={data?.stats?.monthlyPayroll?.toLocaleString() || "0"} sub="last month" badge="Processed" badgeType="neutral" isMoney icon={<span>💵</span>} />
                        <DashboardStatCard label="Active Today" value={loginData?.activeTodayCount?.toString() || "0"} sub="logged in today" badge="Live" badgeType="up" icon={<span>🔐</span>} />
                        <DashboardStatCard label="Attrition Rate" value={(data?.stats?.attritionRate || 0).toFixed(1) + "%"} sub="last 30 days" badge={data?.stats?.attritionRate > 5 ? "Alert" : "Stable"} badgeType={data?.stats?.attritionRate > 5 ? "down" : "up"} icon={<span>📉</span>} />
                    </>
                )}
            </div>

            {/* Recent Logins */}
            {!loading && loginData?.recentLogins?.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Employee Logins</CardTitle>
                            <Badge variant="purple" size="sm">{loginData.recentLogins.length} logins</Badge>
                        </div>
                        <p className="text-xs text-text-3">Last 7 days of login activity</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-0.5 max-h-[180px] overflow-y-auto pr-1">
                            {loginData.recentLogins.map((login: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-bg-2 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar name={login.name || "?"} size="sm" />
                                        <div>
                                            <p className="text-sm font-semibold text-text leading-tight">{login.name}</p>
                                            <p className="text-xs text-text-3">
                                                {login.employee?.designation || "Employee"}
                                                {login.employee?.department?.name ? ` · ${login.employee.department.name}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-accent">
                                            {new Date(login.lastLoginAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                        </p>
                                        <p className="text-[10px] text-text-4">
                                            {new Date(login.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr_1.1fr] gap-4">
                {loading ? (
                    <>
                        <Card className="p-5 h-[340px] flex flex-col items-center justify-center gap-4">
                            <Skeleton className="h-[140px] w-[140px] rounded-full" />
                            <div className="w-full max-w-[200px] grid grid-cols-2 gap-2">
                                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                            </div>
                        </Card>
                        <Card className="p-5 h-[340px]">
                            <Skeleton className="h-6 w-32 mb-4" />
                            <Skeleton className="h-[240px] w-full rounded-lg" />
                        </Card>
                        <Card className="p-5 h-[340px] flex flex-col justify-between">
                            <Skeleton className="h-6 w-24" />
                            <div className="flex gap-2 items-end justify-center h-[200px]">
                                {[40, 60, 80].map((h, i) => <Skeleton key={i} className={`w-8`} style={{ height: `${h}%` }} />)}
                            </div>
                            <Skeleton className="h-4 w-20 mx-auto" />
                        </Card>
                    </>
                ) : (
                    <>
                        {/* Pie Chart */}
                        <Card className="p-5 flex flex-col h-[340px]">
                            <div className="text-sm font-bold text-text flex items-center justify-between mb-2">
                                <span>Department Split</span>
                                {selectedDept && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDept(null)}>Reset</Button>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative">
                                <div className="h-[160px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={deptData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none" cursor="pointer"
                                                onClick={(data) => setSelectedDept(data.name === selectedDept ? null : data.name)}>
                                                {deptData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} opacity={selectedDept && selectedDept !== entry.name ? 0.3 : 1}
                                                        stroke={selectedDept === entry.name ? "var(--text)" : "none"} strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} labelStyle={{ display: "none" }} formatter={(value: any) => [`${value}%`, "Share"]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="text-xl font-extrabold tracking-tight text-text">{data?.stats?.totalEmployees || 0}</div>
                                        <div className="text-[10px] text-text-3 uppercase tracking-wider mt-0.5">Total</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full max-w-[200px] mt-2">
                                    {deptData.map((d: any) => (
                                        <div key={d.name} onClick={() => setSelectedDept(d.name === selectedDept ? null : d.name)}
                                            className={cn("flex items-center gap-1.5 text-xs text-text-2 cursor-pointer hover:opacity-80 transition-opacity", selectedDept && selectedDept !== d.name && "opacity-30")}>
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} />
                                            <span className="truncate">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* Area Chart */}
                        <Card className="p-5 flex flex-col h-[340px]">
                            <div className="text-sm font-bold text-text flex items-center gap-2 mb-4">Hiring Trend</div>
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hiringData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                                        onClick={(e: any) => { if (e?.activePayload?.[0]) setSelectedMonth(e.activePayload[0].payload.month) }} style={{ cursor: "pointer" }}>
                                        <defs>
                                            <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="month" {...axisStyle} dy={10} />
                                        <YAxis {...axisStyle} />
                                        <Tooltip {...tooltipStyle} formatter={(value: any) => [value, "New Hires"]} />
                                        <Area type="monotone" dataKey="hires" stroke="var(--accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHires)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: "var(--accent)", onClick: (_: any, e: any) => setSelectedMonth(e.payload.month) }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-text-3">Last 6 months</span>
                                <Badge variant="success" size="sm" dot>23% growth</Badge>
                            </div>
                        </Card>

                        {/* Bar Chart */}
                        <Card className="p-5 flex flex-col h-[340px]">
                            <div className="text-sm font-bold text-text flex items-center gap-2 mb-4">Salary Range</div>
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salaryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="range" {...axisStyle} tick={{ fontSize: 9, fill: "var(--text3)" }} dy={10} />
                                        <Tooltip cursor={{ fill: "var(--bg2)", opacity: 0.4 }} contentStyle={tooltipStyle.contentStyle} labelStyle={{ display: "none" }} itemStyle={tooltipStyle.itemStyle}
                                            formatter={(value: any) => [value, "Employees"]} />
                                        <Bar dataKey="count" fill={chartColors.primary} radius={[6, 6, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center font-mono text-xs text-text-3 mt-4">
                                Avg: ${data?.avgSalary?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
                            </div>
                        </Card>
                    </>
                )}
            </div>

            {/* Department Overview + Recent Hires */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Department Overview</CardTitle>
                            {selectedDept && <Badge variant="default" size="sm">Filtered: {selectedDept}</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <Skeleton className="h-6 w-6 rounded-md" />
                                        <Skeleton className="h-4 flex-1" />
                                        <Skeleton className="h-4 w-10" />
                                    </div>
                                ))
                            ) : filteredDepts.length > 0 ? (
                                filteredDepts.map((d: any, i: number) => (
                                    <DeptRow key={d.name} name={d.name} count={d.count} pct={d.value} color={d.color} delay={`${0.1 * (i + 1)}s`} />
                                ))
                            ) : (
                                <p className="text-sm text-text-3 py-4 text-center">No departments matching filter</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Hires</CardTitle>
                            {selectedDept && <Badge variant="default" size="sm">Filtered: {selectedDept}</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-0 max-h-[300px] overflow-y-auto pr-1">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="flex gap-4 items-center py-2.5 border-b border-border">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="flex-1 space-y-1">
                                            <Skeleton className="h-3 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                ))
                            ) : filteredHires.length > 0 ? (
                                filteredHires.map((h: any) => (
                                    <HireRow key={h.name} initials={h.initials} name={h.name} role={h.role} date={h.date} color={h.color} />
                                ))
                            ) : (
                                <p className="text-sm text-text-3 py-4 text-center">No hires found{selectedDept ? ` in ${selectedDept}` : ""}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
