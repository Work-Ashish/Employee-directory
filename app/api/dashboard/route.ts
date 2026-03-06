import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action, Roles } from "@/lib/permissions"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { redis } from "@/lib/redis"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (req, ctx) => {
    try {
        let payload: any = { role: ctx.role }

        if (ctx.role !== Roles.EMPLOYEE) {
            // --- ADMINISTRATIVE VIEW (Universal for Admin/Management) ---
            const [totalEmployees, activeEmployees, onLeaveEmployees, resignedEmployees, payroll] = await Promise.all([
                prisma.employee.count({ where: { organizationId: ctx.organizationId } }),
                prisma.employee.count({ where: { status: "ACTIVE", organizationId: ctx.organizationId } }),
                prisma.employee.count({ where: { status: "ON_LEAVE", organizationId: ctx.organizationId } }),
                prisma.employee.count({
                    where: {
                        status: { in: ["RESIGNED", "TERMINATED"] },
                        updatedAt: { gte: subMonths(new Date(), 1) },
                        organizationId: ctx.organizationId
                    }
                }),
                prisma.employee.aggregate({
                    where: { organizationId: ctx.organizationId },
                    _sum: { salary: true }
                }),
            ])

            const departments = await prisma.department.findMany({
                where: { organizationId: ctx.organizationId },
                include: {
                    _count: {
                        select: { employees: { where: { organizationId: ctx.organizationId } } }
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

            const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
            const hiringRaw = await prisma.employee.groupBy({
                by: ["dateOfJoining"],
                where: {
                    dateOfJoining: { gte: sixMonthsAgo },
                    organizationId: ctx.organizationId
                },
                _count: true,
            })

            const hiringMap = new Map<string, number>()
            for (let i = 5; i >= 0; i--) {
                hiringMap.set(format(subMonths(new Date(), i), "MMM"), 0)
            }
            for (const row of hiringRaw) {
                const month = format(new Date(row.dateOfJoining), "MMM")
                if (hiringMap.has(month)) {
                    hiringMap.set(month, (hiringMap.get(month) || 0) + row._count)
                }
            }
            const hiringTrend = Array.from(hiringMap, ([month, hires]) => ({ month, hires }))

            const salaryStats: any[] = await prisma.$queryRaw`
                SELECT 
                    COUNT(*) FILTER (WHERE salary >= 30000 AND salary < 50000)::int as "range_30_50",
                    COUNT(*) FILTER (WHERE salary >= 50000 AND salary < 80000)::int as "range_50_80",
                    COUNT(*) FILTER (WHERE salary >= 80000 AND salary < 120000)::int as "range_80_120",
                    COUNT(*) FILTER (WHERE salary >= 120000)::int as "range_120_plus",
                    COALESCE(AVG(salary), 0) as avg_salary
                FROM "Employee"
                WHERE "organizationId" = ${ctx.organizationId}
            `
            const stats = salaryStats[0] || {}
            const salaryRanges = [
                { range: "30-50k", count: Number(stats.range_30_50 || 0) },
                { range: "50-80k", count: Number(stats.range_50_80 || 0) },
                { range: "80-120k", count: Number(stats.range_80_120 || 0) },
                { range: "120k+", count: Number(stats.range_120_plus || 0) },
            ]

            const recentHiresRaw = await prisma.employee.findMany({
                where: { organizationId: ctx.organizationId },
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

            payload = {
                ...payload,
                stats: {
                    totalEmployees,
                    activeEmployees,
                    onLeaveEmployees,
                    monthlyPayroll: payroll._sum.salary || 0,
                    attritionRate: totalEmployees > 0 ? (resignedEmployees / totalEmployees) * 100 : 0
                },
                deptSplit,
                hiringTrend,
                salaryRanges,
                avgSalary: Number(stats.avg_salary || 0),
                recentHires
            }
        } else {
            // --- EMPLOYEE VIEW (Polymorphic Logic) ---
            const employee = await prisma.employee.findUnique({
                where: { userId: ctx.userId },
                include: {
                    department: true,
                    attendanceRecords: {
                        where: {
                            date: {
                                gte: startOfMonth(new Date()),
                                lte: endOfMonth(new Date())
                            }
                        }
                    },
                    trainings: {
                        where: { completed: false }
                    },
                    leaves: {
                        where: { status: "APPROVED" }
                    },
                    manager: true
                }
            })

            if (!employee) {
                return apiError("Employee profile not found", ApiErrorCode.NOT_FOUND, 404)
            }

            // Mock team status for now (can be improved with real check-in status later)
            const teamMembers = await prisma.employee.findMany({
                where: {
                    departmentId: employee.departmentId,
                    organizationId: ctx.organizationId,
                    NOT: { id: employee.id }
                },
                take: 5
            })

            // Derive team status from today's attendance records
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const teamAttendance = await prisma.attendance.findMany({
                where: {
                    employeeId: { in: teamMembers.map(tm => tm.id) },
                    date: { gte: today },
                },
                select: { employeeId: true },
            })
            const presentIds = new Set(teamAttendance.map(a => a.employeeId))

            // Derive review status from latest performance review
            const latestReview = await prisma.performanceReview.findFirst({
                where: { employeeId: employee.id },
                orderBy: { createdAt: "desc" },
                select: { status: true, reviewPeriod: true },
            })

            payload = {
                ...payload,
                stats: {
                    attendanceCount: employee.attendanceRecords.length,
                    leavesUsed: employee.leaves.length,
                    pendingTrainingCount: employee.trainings.length,
                    reviewStatus: latestReview
                        ? `${latestReview.status}${latestReview.reviewPeriod ? ` (${latestReview.reviewPeriod})` : ""}`
                        : "No reviews yet",
                },
                teamStatus: teamMembers.map(tm => ({
                    name: `${tm.firstName} ${tm.lastName}`,
                    status: presentIds.has(tm.id) ? "Active" : "Away",
                    initials: `${tm.firstName[0]}${tm.lastName[0]}`.toUpperCase()
                }))
            }
        }

        return apiSuccess(payload)
    } catch (error) {
        console.error("[DASHBOARD_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
