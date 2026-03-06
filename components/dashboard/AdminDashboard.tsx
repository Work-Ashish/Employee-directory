import * as React from "react"
import { extractArray, cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Modal } from "@/components/ui/Modal"
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts"
import { StatCard, DeptRow, HireRow } from "./DashboardComponents"

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
                fetch('/api/dashboard', { cache: 'no-store' }),
                fetch('/api/dashboard/logins', { cache: 'no-store' }),
            ])
            if (dashRes.ok) {
                const dashJson = await dashRes.json()
                setData(dashJson.data || (typeof dashJson === 'object' && !Array.isArray(dashJson) ? dashJson : null))
            } else {
                const errorJson = await dashRes.json().catch(() => ({}));
                console.error("Dashboard API error:", dashRes.status, errorJson.error?.message || dashRes.statusText)
            }
            if (loginRes.ok) {
                const loginJson = await loginRes.json()
                setLoginData(loginJson.data || (typeof loginJson === 'object' && !Array.isArray(loginJson) ? loginJson : null))
            } else {
                const errorJson = await loginRes.json().catch(() => ({}));
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
            interval = setInterval(() => {
                fetchDashboardData()
            }, 30000) // Poll every 30 seconds (not 10s — prevents connection storm at scale)
        }

        const handleVisibility = () => {
            if (document.hidden) {
                if (interval) clearInterval(interval)
                interval = null
            } else {
                fetchDashboardData() // Refresh immediately when tab regains focus
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
            const res = await fetch('/api/admin/analytics/burnout')
            if (res.ok) {
                const json = await res.json()
                setReportData(json.report || 'No data found')
            } else {
                setReportData('Error generating report.')
            }
        } catch (error) {
            console.error(error)
            setReportData('Failed to generate report.')
        } finally {
            setReportLoading(false)
        }
    }

    const deptData = extractArray(data?.deptSplit)
    const hiringData = extractArray(data?.hiringTrend)
    const salaryData = extractArray(data?.salaryRanges)
    const recentHires = extractArray(data?.recentHires)

    const filteredDepts = selectedDept
        ? deptData.filter((d: any) => d.name === selectedDept)
        : deptData

    const filteredHires = selectedDept
        ? recentHires.filter((h: any) => h.dept === selectedDept)
        : recentHires

    const selectedMonthData: any = selectedMonth ? hiringData.find((d: any) => d.month === selectedMonth) : null

    return (
        <div className="space-y-5">
            <Modal
                isOpen={!!reportData}
                onClose={() => setReportData(null)}
                title="AI Team Health & Burnout Report"
            >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-[13.5px] text-[var(--text2)] leading-relaxed p-4 bg-[var(--surface3)] rounded-lg border border-[var(--border)] max-h-[60vh] overflow-y-auto">
                        {reportData}
                    </pre>
                </div>
            </Modal>

            <Modal
                isOpen={!!selectedMonth}
                onClose={() => setSelectedMonth(null)}
                title={`Hires in ${selectedMonth}`}
            >
                <div className="space-y-4">
                    <div className="text-[13px] text-[#8a8fa8]">
                        List of employees hired in {selectedMonth} 2024.
                    </div>
                    <div className="space-y-2">
                        {selectedMonthData?.details.map((hire: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface3)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-[10px] font-bold text-white">
                                        {hire.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-semibold text-[var(--text)]">{hire.name}</div>
                                        <div className="text-[11px] text-[var(--text3)]">{hire.role}</div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono bg-[var(--green-dim)] text-[var(--green)] px-2 py-0.5 rounded-full">New</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Page Header */}
            <div className="flex items-center justify-between pb-1">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-[-0.5px] text-[var(--text)]">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, <span className="text-[var(--accent)]">Admin</span> 👋
                    </h1>
                    <p className="text-[13px] text-[var(--text3)] mt-0.5">Here's what's happening with your team today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={generateReport}
                        disabled={reportLoading}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[var(--purple)] to-[var(--accent)] text-white text-[12px] font-semibold tracking-wide hover:opacity-90 disabled:opacity-50 transition-opacity border border-white/10 shadow-md"
                    >
                        {reportLoading ? (
                            <>
                                <span className="animate-spin text-[14px]">🧠</span>
                                Generating...
                            </>
                        ) : (
                            <>
                                <span className="text-[14px]">✨</span>
                                AI Team Health Report
                            </>
                        )}
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green)]"></span>
                        </span>
                        <span className="text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider">Live</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-1">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5 h-[130px] flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[var(--bg2)]" />
                                <div className="h-3 w-20 bg-[var(--bg)] rounded" />
                            </div>
                            <div className="h-7 w-16 bg-[var(--bg)] rounded" />
                            <div className="h-3 w-24 bg-[var(--bg)] rounded" />
                        </div>
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Total Employees"
                            value={data?.stats?.totalEmployees?.toString() || "0"}
                            sub="last month"
                            badge="7%"
                            badgeType="up"
                            icon="👥"
                            iconClass="bg-[var(--accent3)]/10"
                        />
                        <StatCard
                            label="Active Employees"
                            value={data?.stats?.activeEmployees?.toString() || "0"}
                            sub="last month"
                            badge="5%"
                            badgeType="up"
                            icon="✅"
                            iconClass="bg-[var(--green-dim)]"
                        />
                        <StatCard
                            label="On Leave"
                            value={data?.stats?.onLeaveEmployees?.toString() || "0"}
                            sub="last month"
                            badge="4%"
                            badgeType="up"
                            icon="🌴"
                            iconClass="bg-[var(--amber-dim)]"
                        />
                        <StatCard
                            label="Monthly Payroll"
                            value={data?.stats?.monthlyPayroll?.toLocaleString() || "0"}
                            sub="last month"
                            badge="Processed"
                            badgeType="neutral"
                            isMoney
                            icon="💵"
                            iconClass="bg-[var(--blue-dim)]"
                        />
                        <StatCard
                            label="Active Today"
                            value={loginData?.activeTodayCount?.toString() || "0"}
                            sub="logged in today"
                            badge="Live"
                            badgeType="up"
                            icon="🔐"
                            iconClass="bg-[var(--purple-dim)]"
                        />
                        <StatCard
                            label="Attrition Rate"
                            value={(data?.stats?.attritionRate || 0).toFixed(1) + "%"}
                            sub="last 30 days"
                            badge={data?.stats?.attritionRate > 5 ? "Alert" : "Stable"}
                            badgeType={data?.stats?.attritionRate > 5 ? "down" : "up"}
                            icon="📉"
                            iconClass="bg-[var(--red-dim)]"
                        />
                    </>
                )}
            </div>

            {/* Recent Employee Logins */}
            {!loading && loginData?.recentLogins?.length > 0 && (
                <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-[14px] font-bold text-[var(--text)]">Recent Employee Logins</h3>
                            <p className="text-[11.5px] text-[var(--text3)] mt-0.5">Last 7 days of login activity</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--purple-dim)] text-[var(--purple)] border border-[var(--border)]">
                            {loginData.recentLogins.length} logins
                        </span>
                    </div>
                    <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
                        {loginData.recentLogins.map((login: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg2)] transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                        {login.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-[12.5px] font-semibold text-[var(--text)] leading-tight">{login.name}</p>
                                        <p className="text-[11px] text-[var(--text3)]">
                                            {login.employee?.designation || 'Employee'}
                                            {login.employee?.department?.name ? ` · ${login.employee.department.name}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-mono text-[var(--accent)]">
                                        {new Date(login.lastLoginAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </p>
                                    <p className="text-[10px] text-[var(--text4)]">
                                        {new Date(login.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-[1fr_1.7fr_1.1fr] gap-4 max-h-[340px]">
                {loading ? (
                    <>
                        <div className="glass p-[22px] h-[340px] flex flex-col items-center justify-center gap-4">
                            <Skeleton className="h-[140px] w-[140px] rounded-full" />
                            <div className="w-full max-w-[200px] grid grid-cols-2 gap-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                        <div className="glass p-[22px] h-[340px] relative">
                            <Skeleton className="h-6 w-32 mb-4" />
                            <Skeleton className="h-[240px] w-full rounded-lg" />
                        </div>
                        <div className="glass p-[22px] h-[340px] flex flex-col justify-between">
                            <Skeleton className="h-6 w-24" />
                            <div className="flex gap-2 items-end justify-center h-[200px]">
                                <Skeleton className="h-[40%] w-8" />
                                <Skeleton className="h-[60%] w-8" />
                                <Skeleton className="h-[80%] w-8" />
                            </div>
                            <Skeleton className="h-4 w-20 mx-auto" />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Interactive Pie Chart */}
                        <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5 flex flex-col h-full">
                            <div className="text-[13px] font-bold text-[var(--text)] flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2"><span className="text-[15px]">🏢</span> Department Split</div>
                                {selectedDept && (
                                    <button
                                        onClick={() => setSelectedDept(null)}
                                        className="text-[10px] bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-full hover:bg-[var(--surface3)] transition-colors"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative">
                                <div className="h-[160px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={deptData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                                cursor="pointer"
                                                onClick={(data) => setSelectedDept(data.name === selectedDept ? null : data.name)}
                                            >
                                                {deptData.map((entry: any, index: number) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        opacity={selectedDept && selectedDept !== entry.name ? 0.3 : 1}
                                                        stroke={selectedDept === entry.name ? "var(--text)" : "none"}
                                                        strokeWidth={2}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}
                                                labelStyle={{ display: 'none' }}
                                                formatter={(value: any) => [`${value}%`, 'Share']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="text-[22px] font-extrabold tracking-[-0.5px] text-[var(--text)]">{data?.stats?.totalEmployees || 0}</div>
                                        <div className="text-[10px] text-[var(--text3)] uppercase tracking-[0.5px] mt-[2px]">Total</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full max-w-[200px] mt-2">
                                    {deptData.map((d: any) => (
                                        <div
                                            key={d.name}
                                            onClick={() => setSelectedDept(d.name === selectedDept ? null : d.name)}
                                            className={cn(
                                                "flex items-center gap-[6px] text-[11px] text-[var(--text2)] cursor-pointer hover:opacity-80 transition-opacity",
                                                selectedDept && selectedDept !== d.name && "opacity-30"
                                            )}
                                        >
                                            <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                                            <span className="truncate">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Area Chart */}
                        <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5 flex flex-col h-full">
                            <div className="text-[13px] font-bold text-[var(--text)] flex items-center gap-2 mb-4">
                                <span className="text-[15px]">📈</span> Hiring Trend
                            </div>
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={hiringData}
                                        margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                                        onClick={(e: any) => {
                                            if (e && e.activePayload && e.activePayload[0]) {
                                                setSelectedMonth(e.activePayload[0].payload.month);
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <defs>
                                            <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: 'var(--text3)' }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: 'var(--text3)' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                            labelStyle={{ color: 'var(--text3)', fontSize: '11px', marginBottom: '4px' }}
                                            itemStyle={{ color: '#007aff', fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(value: any) => [value, 'New Hires']}
                                            cursor={{ stroke: 'var(--text3)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="hires"
                                            stroke="var(--accent)"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorHires)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent)', onClick: (_: any, e: any) => setSelectedMonth(e.payload.month) }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[12px] text-[var(--text3)]">
                                <span>Last 6 months</span>
                                <span className="text-[var(--green)] bg-[var(--green-dim)] px-[9px] py-[3px] rounded-[20px] font-bold font-mono">↑ 23% growth</span>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5 flex flex-col h-full">
                            <div className="text-[13px] font-bold text-[var(--text)] flex items-center gap-2 mb-4">
                                <span className="text-[15px]">💰</span> Salary Range
                            </div>
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salaryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis
                                            dataKey="range"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fill: 'var(--text3)' }}
                                            dy={10}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'var(--bg2)', opacity: 0.4 }}
                                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                            labelStyle={{ display: 'none' }}
                                            itemStyle={{ color: 'var(--text)', fontSize: '12px' }}
                                            formatter={(value: any, name: any, props: any) => [value, 'Employees']}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="var(--accent2)"
                                            radius={[6, 6, 0, 0]}
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center font-mono text-[11px] text-[var(--text3)] mt-4">Avg: ${data?.avgSalary?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}</div>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-[1.3fr_1fr] gap-4">
                <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5">
                    <div className="text-[13px] font-bold text-[var(--text)] flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2"><span>🏢</span> Department Overview</div>
                        {selectedDept && <span className="text-[11px] text-[var(--accent)] font-medium bg-[var(--accent3)]/10 px-2 py-0.5 rounded-md">Filtered: {selectedDept}</span>}
                    </div>
                    <div className="space-y-3">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <Skeleton className="h-6 w-6 rounded-md" />
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-4 w-10" />
                                </div>
                            ))
                        ) : (
                            filteredDepts.length > 0 ? (
                                filteredDepts.map((d: any, i: number) => (
                                    <DeptRow
                                        key={d.name}
                                        name={d.name}
                                        count={d.count}
                                        pct={d.value}
                                        color={d.color}
                                        delay={`${0.1 * (i + 1)}s`}
                                    />
                                ))
                            ) : (
                                <div className="text-[13px] text-[var(--text3)] py-4 text-center">No departments matching filter</div>
                            )
                        )}
                    </div>
                </div>

                <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5">
                    <div className="text-[13px] font-bold text-[var(--text)] flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2"><span>✨</span> Recent Hires</div>
                        {selectedDept && <span className="text-[11px] text-[var(--accent)] font-medium bg-[var(--accent3)]/10 px-2 py-0.5 rounded-md">Filtered: {selectedDept}</span>}
                    </div>
                    <div className="flex flex-col gap-0 max-h-[300px] overflow-y-auto pr-1">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex gap-4 items-center py-[10px] border-b border-[var(--border)]">
                                    <Skeleton className="h-9 w-9 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            ))
                        ) : (
                            filteredHires.length > 0 ? (
                                filteredHires.map((h: any) => (
                                    <HireRow
                                        key={h.name}
                                        initials={h.initials}
                                        name={h.name}
                                        role={h.role}
                                        date={h.date}
                                        color={h.color}
                                    />
                                ))
                            ) : (
                                <div className="text-[13px] text-[var(--text3)] py-4 text-center">No hires found in {selectedDept}</div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
