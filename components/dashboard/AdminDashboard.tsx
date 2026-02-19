import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Modal } from "@/components/ui/Modal"
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts"
import { StatCard, DeptRow, HireRow } from "./DashboardComponents"

const deptData = [
    { name: "Engineering", value: 30, color: "#007aff", count: 3 },
    { name: "Sales", value: 20, color: "#38bdf8", count: 2 },
    { name: "Marketing", value: 20, color: "#ec4899", count: 2 },
    { name: "Finance", value: 10, color: "#f59e0b", count: 1 },
    { name: "HR", value: 10, color: "#10b981", count: 1 }
]

const hiringData = [
    { month: 'Jan', hires: 2, details: [{ name: 'Alex M.', role: 'Intern' }, { name: 'Sarah J.', role: 'Jr Dev' }] },
    { month: 'Feb', hires: 4, details: [{ name: 'Mike T.', role: 'Sales' }, { name: 'Jenny L.', role: 'HR' }, { name: 'Rob S.', role: 'Marketing' }, { name: 'Kate W.', role: 'Finance' }] },
    { month: 'Mar', hires: 3, details: [{ name: 'Tom B.', role: 'DevOps' }, { name: 'Jerry C.', role: 'QA' }, { name: 'Ben G.', role: 'Design' }] },
    { month: 'Apr', hires: 7, details: Array(7).fill({ name: 'New Hire', role: 'Expansion Team' }) },
    { month: 'May', hires: 5, details: Array(5).fill({ name: 'New Hire', role: 'Support' }) },
    { month: 'Jun', hires: 9, details: Array(9).fill({ name: 'New Hire', role: 'Engineering' }) },
]

const salaryData = [
    { range: '30-50k', count: 5 },
    { range: '50-80k', count: 12 },
    { range: '80-120k', count: 8 },
    { range: '120k+', count: 3 },
]

const recentHires = [
    { initials: "MJ", name: "Michael Johnson", role: "Sales Representative", dept: "Sales", date: "Mar 10", color: "bg-gradient-to-br from-[#007aff] to-[#5856d6]" },
    { initials: "LA", name: "Lisa Anderson", role: "Content Strategist", dept: "Marketing", date: "Jan 8", color: "bg-gradient-to-br from-[#ec4899] to-[#f43f5e]" },
    { initials: "DW", name: "David Wilson", role: "Financial Analyst", dept: "Finance", date: "Nov 15", color: "bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9]" },
    { initials: "JD", name: "John Doe", role: "Senior Software Engineer", dept: "Engineering", date: "Jan 15", color: "bg-gradient-to-br from-[#3395ff] to-[#007aff]" },
    { initials: "JT", name: "James Taylor", role: "DevOps Engineer", dept: "Engineering", date: "Oct 30", color: "bg-gradient-to-br from-[#10b981] to-[#059669]" },
]

export function AdminDashboard() {
    const [loading, setLoading] = React.useState(true)
    const [selectedDept, setSelectedDept] = React.useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null)

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false)
        }, 2000)
        return () => clearTimeout(timer)
    }, [])

    const filteredDepts = selectedDept
        ? deptData.filter(d => d.name === selectedDept)
        : deptData

    const filteredHires = selectedDept
        ? recentHires.filter(h => h.dept === selectedDept)
        : recentHires

    const selectedMonthData = selectedMonth ? hiringData.find(d => d.month === selectedMonth) : null

    return (
        <div className="space-y-6">
            <Modal
                isOpen={!!selectedMonth}
                onClose={() => setSelectedMonth(null)}
                title={`Hires in ${selectedMonth}`}
            >
                <div className="space-y-4">
                    <div className="text-[13px] text-[var(--text3)]">
                        List of employees hired in {selectedMonth} 2024.
                    </div>
                    <div className="space-y-2">
                        {selectedMonthData?.details.map((hire: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--purple)] flex items-center justify-center text-[10px] font-bold text-white">
                                        {hire.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-semibold text-[var(--text)]">{hire.name}</div>
                                        <div className="text-[11px] text-[var(--text3)]">{hire.role}</div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono bg-[var(--green-dim)] text-[#1a9140] px-2 py-0.5 rounded-full">New</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Dashboard Overview</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Monitor your team performance and key metrics in real-time</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="glass p-5 h-[160px] flex flex-col justify-between">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-10 rounded-[10px]" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Total Employees"
                            value="10"
                            sub="All registered employees"
                            badge="↑ 12% vs last month"
                            badgeType="up"
                            icon="👥"
                            iconClass="bg-[rgba(0,122,255,0.1)]"
                            glowClass="before:bg-[rgba(0,122,255,0.1)]"
                        />
                        <StatCard
                            label="Active Employees"
                            value="9"
                            sub="Currently working"
                            badge="↑ 8% vs last month"
                            badgeType="up"
                            icon="✅"
                            iconClass="bg-[var(--green-dim)]"
                            glowClass="before:bg-[rgba(52,199,89,0.1)]"
                        />
                        <StatCard
                            label="On Leave"
                            value="1"
                            sub="Employees on leave"
                            icon="🌴"
                            iconClass="bg-[var(--amber-dim)]"
                            glowClass="before:bg-[rgba(255,149,0,0.1)]"
                        />
                        <StatCard
                            label="Monthly Payroll"
                            value="$75,083"
                            sub="Total monthly expense"
                            badge="↓ 3% vs last month"
                            badgeType="down"
                            isMoney
                            icon="💵"
                            iconClass="bg-[var(--blue-dim)]"
                            glowClass="before:bg-[rgba(50,173,230,0.1)]"
                        />
                    </>
                )}
            </div>

            {/* ... Rest of existing dashboard code can be moved here ... */}
            {/* For brevity, I will copy the rest of the chart sections here */}
            <div className="grid grid-cols-[1fr_1.7fr_1.1fr] gap-4 mb-5 max-h-[340px]">
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
                        <div className="glass p-[22px] flex flex-col h-full">
                            <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center justify-between mb-2">
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
                                                {deptData.map((entry, index) => (
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
                                                formatter={(value: number) => [`${value}%`, 'Share']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="text-[22px] font-extrabold tracking-[-0.5px] text-[var(--text)]">10</div>
                                        <div className="text-[10px] text-[var(--text3)] uppercase tracking-[0.5px] mt-[2px]">Total</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full max-w-[200px] mt-2">
                                    {deptData.map((d) => (
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
                        <div className="glass p-[22px] flex flex-col h-full">
                            <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center gap-2 mb-[18px]">
                                <span className="text-[15px]">📈</span> Hiring Trend
                            </div>
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={hiringData}
                                        margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                                        onClick={(e) => {
                                            if (e && e.activePayload && e.activePayload[0]) {
                                                setSelectedMonth(e.activePayload[0].payload.month);
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <defs>
                                            <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#007aff" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
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
                                            formatter={(value: number) => [value, 'New Hires']}
                                            cursor={{ stroke: 'var(--text3)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="hires"
                                            stroke="#007aff"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorHires)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#007aff', onClick: (_: any, e: any) => setSelectedMonth(e.payload.month) }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[12px] text-[var(--text3)]">
                                <span>Last 6 months</span>
                                <span className="text-[#1a9140] bg-[var(--green-dim)] px-[9px] py-[3px] rounded-[20px] border border-[rgba(52,199,89,0.2)] font-bold font-mono">↑ 23% growth</span>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="glass p-[22px] flex flex-col h-full">
                            <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center gap-2 mb-[18px]">
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
                                            formatter={(value: number, name: string, props: any) => [value, 'Employees']}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="#66b2ff"
                                            radius={[4, 4, 0, 0]}
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center font-mono text-[11px] text-[var(--text3)] mt-4">Avg: $1,00,111</div>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-[1.3fr_1fr] gap-4">
                <div className="glass p-[22px]">
                    <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center justify-between mb-[16px]">
                        <div className="flex items-center gap-2"><span>🏢</span> Department Overview</div>
                        {selectedDept && <span className="text-[11px] text-[var(--accent)] font-medium bg-[var(--bg2)] px-2 py-0.5 rounded-md">Filtered: {selectedDept}</span>}
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
                                filteredDepts.map((d, i) => (
                                    <DeptRow
                                        key={d.name}
                                        name={d.name}
                                        count={d.count}
                                        pct={(d.value / 10) * 100} // Recalculate if needed, simplified here
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

                <div className="glass p-[22px]">
                    <div className="text-[13.5px] font-bold text-[var(--text)] flex items-center justify-between mb-[16px]">
                        <div className="flex items-center gap-2"><span>✨</span> Recent Hires</div>
                        {selectedDept && <span className="text-[11px] text-[var(--accent)] font-medium bg-[var(--bg2)] px-2 py-0.5 rounded-md">Filtered: {selectedDept}</span>}
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
                                filteredHires.map((h) => (
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
