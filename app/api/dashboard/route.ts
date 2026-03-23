/**
 * /api/dashboard — Local handler that computes dashboard stats from Django employees.
 *
 * Django has no dedicated /dashboard/ endpoint, so we fetch the full employee
 * list and compute stats (totals, department split, hiring trend, salary ranges,
 * recent hires) on the Next.js side.
 */
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

function getDjangoBase(): string {
    return (
        process.env.DJANGO_GATEWAY_URL ||
        process.env.DJANGO_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://127.0.0.1:8000"
    )
}

function forwardHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = req.headers.get("authorization")
    if (auth) headers["Authorization"] = auth
    const slug = req.headers.get("x-tenant-slug") || req.headers.get("X-Tenant-Slug")
    if (slug) headers["X-Tenant-Slug"] = slug
    return headers
}

const DEPT_COLORS = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
    "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
]

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface RawEmployee {
    id?: string
    first_name?: string
    last_name?: string
    email?: string
    department?: string
    designation?: string
    status?: string
    start_date?: string
    salary?: number
    created_at?: string
}

export async function GET(req: Request) {
    try {
        const base = getDjangoBase()
        const headers = forwardHeaders(req)

        const res = await fetch(`${base}/api/v1/employees/?per_page=10000`, {
            headers,
            signal: AbortSignal.timeout(15_000),
        })

        if (!res.ok) {
            return NextResponse.json(
                { error: { detail: "Failed to fetch employees from Django" } },
                { status: res.status }
            )
        }

        const json = await res.json()
        const employees: RawEmployee[] = json.data?.results || json.results || (Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [])

        // --- Stats ---
        const totalEmployees = employees.length
        const activeEmployees = employees.filter(e => e.status === "active" || e.status === "pre_joining").length
        const onLeaveEmployees = employees.filter(e => e.status === "on_notice").length
        const exitedEmployees = employees.filter(e => e.status === "exited").length
        const salaries = employees.map(e => e.salary || 0).filter(s => s > 0)
        const monthlyPayroll = salaries.reduce((sum, s) => sum + s, 0)
        const avgSalary = salaries.length > 0 ? monthlyPayroll / salaries.length : 0
        const attritionRate = totalEmployees > 0 ? (exitedEmployees / totalEmployees) * 100 : 0

        // --- Department Split ---
        const deptCounts = new Map<string, number>()
        for (const emp of employees) {
            const dept = emp.department || "Unassigned"
            deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1)
        }
        const deptSplit = Array.from(deptCounts.entries()).map(([name, count], i) => ({
            name,
            count,
            value: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0,
            color: DEPT_COLORS[i % DEPT_COLORS.length],
        }))

        // --- Hiring Trend (last 6 months) ---
        const now = new Date()
        const hiringTrend = []
        for (let m = 5; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            const monthLabel = MONTH_NAMES[d.getMonth()]
            const hires = employees.filter(emp => {
                const sd = emp.start_date || emp.created_at || ""
                return sd.startsWith(monthKey)
            })
            hiringTrend.push({
                month: monthLabel,
                hires: hires.length,
                details: hires.map(h => ({
                    name: `${h.first_name || ""} ${h.last_name || ""}`.trim(),
                    role: h.designation || "Employee",
                })),
            })
        }

        // --- Salary Ranges ---
        const ranges = [
            { label: "0-25K", min: 0, max: 25000 },
            { label: "25-50K", min: 25000, max: 50000 },
            { label: "50-75K", min: 50000, max: 75000 },
            { label: "75-100K", min: 75000, max: 100000 },
            { label: "100K+", min: 100000, max: Infinity },
        ]
        const salaryRanges = ranges.map(r => ({
            range: r.label,
            count: employees.filter(e => {
                const s = e.salary || 0
                return s >= r.min && s < r.max
            }).length,
        }))

        // --- Recent Hires (last 10, sorted by start_date desc) ---
        const sorted = [...employees]
            .filter(e => e.start_date || e.created_at)
            .sort((a, b) => {
                const da = a.start_date || a.created_at || ""
                const db = b.start_date || b.created_at || ""
                return db.localeCompare(da)
            })
            .slice(0, 10)

        const recentHires = sorted.map((h, i) => {
            const firstName = h.first_name || ""
            const lastName = h.last_name || ""
            const name = `${firstName} ${lastName}`.trim() || "Unknown"
            const dept = h.department || "Unassigned"
            return {
                name,
                initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "??",
                role: h.designation || "Employee",
                date: h.start_date || h.created_at || "",
                dept,
                color: DEPT_COLORS[i % DEPT_COLORS.length],
            }
        })

        return NextResponse.json({
            data: {
                stats: {
                    totalEmployees,
                    activeEmployees,
                    onLeaveEmployees,
                    monthlyPayroll,
                    attritionRate,
                },
                deptSplit,
                hiringTrend,
                salaryRanges,
                recentHires,
                avgSalary,
            },
        })
    } catch (err) {
        console.error("Dashboard stats error:", err)
        return NextResponse.json(
            { error: { detail: "Failed to compute dashboard stats" } },
            { status: 502 }
        )
    }
}
