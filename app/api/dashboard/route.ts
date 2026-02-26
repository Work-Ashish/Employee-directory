import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 1. Employee Stats
        const [totalEmployees, activeEmployees, onLeaveEmployees] = await Promise.all([
            prisma.employee.count(),
            prisma.employee.count({ where: { status: "ACTIVE" } }),
            prisma.employee.count({ where: { status: "ON_LEAVE" } })
        ])

        // 2. Payroll (Sum of all employee salaries)
        const payroll = await prisma.employee.aggregate({
            _sum: { salary: true }
        })

        // 3. Department Split
        const departments = await prisma.department.findMany({
            include: {
                _count: {
                    select: { employees: true }
                }
            }
        })

        const totalForSplit = departments.reduce((acc: number, d: any) => acc + d._count.employees, 0)
        const colors = ["#007aff", "#38bdf8", "#ec4899", "#f59e0b", "#10b981", "#af52de", "#ff2d55"]
        const deptSplit = departments.map((d: any, i: number) => ({
            name: d.name,
            value: totalForSplit > 0 ? Math.round((d._count.employees / totalForSplit) * 100) : 0,
            count: d._count.employees,
            color: colors[i % colors.length]
        }))

        // 4. Hiring Trend (Last 6 months)
        const hiringTrend: { month: string, hires: number }[] = []
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i)
            const start = startOfMonth(monthDate)
            const end = endOfMonth(monthDate)
            const count = await prisma.employee.count({
                where: {
                    dateOfJoining: {
                        gte: start,
                        lte: end
                    }
                }
            })
            hiringTrend.push({
                month: format(monthDate, "MMM"),
                hires: count
            })
        }

        // 5. Salary Range
        const employees = await prisma.employee.findMany({ select: { salary: true } })
        const salaryRanges = [
            { range: "30-50k", count: employees.filter((e: any) => e.salary >= 30000 && e.salary < 50000).length },
            { range: "50-80k", count: employees.filter((e: any) => e.salary >= 50000 && e.salary < 80000).length },
            { range: "80-120k", count: employees.filter((e: any) => e.salary >= 80000 && e.salary < 120000).length },
            { range: "120k+", count: employees.filter((e: any) => e.salary >= 120000).length },
        ]
        const avgSalary = employees.length > 0 ? employees.reduce((acc: number, e: any) => acc + e.salary, 0) / employees.length : 0

        // 6. Recent Hires
        const recentHiresRaw = await prisma.employee.findMany({
            take: 5,
            orderBy: { dateOfJoining: "desc" },
            include: { department: true }
        })
        const recentHires = recentHiresRaw.map((h: any) => ({
            initials: `${h.firstName[0]}${h.lastName[0]}`.toUpperCase(),
            name: `${h.firstName} ${h.lastName}`,
            role: h.designation,
            dept: h.department?.name || "Unassigned",
            date: format(h.dateOfJoining, "MMM d"),
            color: "bg-gradient-to-br from-[#3395ff] to-[#007aff]"
        }))

        return NextResponse.json({
            role: "ADMIN",
            stats: {
                totalEmployees,
                activeEmployees,
                onLeaveEmployees,
                monthlyPayroll: payroll._sum.salary || 0,
            },
            deptSplit,
            hiringTrend,
            salaryRanges,
            avgSalary,
            recentHires
        })
    } catch (error) {
        console.error("[DASHBOARD_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
