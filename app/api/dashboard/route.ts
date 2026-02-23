import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfMonth, endOfMonth, startOfToday, endOfToday, subMonths, format } from "date-fns"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userRole = session.user.role
        const userId = session.user.id

        if (userRole === "ADMIN") {
            // --- ADMIN METRICS ---

            // 1. Employee Stats
            const [totalEmployees, activeEmployees, onLeaveEmployees] = await Promise.all([
                prisma.employee.count(),
                prisma.employee.count({ where: { status: "ACTIVE" } }),
                prisma.employee.count({ where: { status: "ON_LEAVE" } })
            ])

            // 2. Payroll (Sum of all employee salaries for simplicity, or last month's processed payroll)
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

            const totalForSplit = departments.reduce((acc, d) => acc + d._count.employees, 0)
            const colors = ["#007aff", "#38bdf8", "#ec4899", "#f59e0b", "#10b981", "#af52de", "#ff2d55"]
            const deptSplit = departments.map((d, i) => ({
                name: d.name,
                value: totalForSplit > 0 ? Math.round((d._count.employees / totalForSplit) * 100) : 0,
                count: d._count.employees,
                color: colors[i % colors.length]
            }))

            // 4. Hiring Trend (Last 6 months)
            const hiringTrend = []
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
                { range: "30-50k", count: employees.filter(e => e.salary >= 30000 && e.salary < 50000).length },
                { range: "50-80k", count: employees.filter(e => e.salary >= 50000 && e.salary < 80000).length },
                { range: "80-120k", count: employees.filter(e => e.salary >= 80000 && e.salary < 120000).length },
                { range: "120k+", count: employees.filter(e => e.salary >= 120000).length },
            ]
            const avgSalary = employees.length > 0 ? employees.reduce((acc, e) => acc + e.salary, 0) / employees.length : 0

            // 6. Recent Hires
            const recentHiresRaw = await prisma.employee.findMany({
                take: 5,
                orderBy: { dateOfJoining: "desc" },
                include: { department: true }
            })
            const recentHires = recentHiresRaw.map(h => ({
                initials: `${h.firstName[0]}${h.lastName[0]}`.toUpperCase(),
                name: `${h.firstName} ${h.lastName}`,
                role: h.designation,
                dept: h.department.name,
                date: format(h.dateOfJoining, "MMM d"),
                color: "bg-gradient-to-br from-[#3395ff] to-[#007aff]" // Default color
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
        } else {
            // --- EMPLOYEE METRICS ---
            const employee = await prisma.employee.findUnique({
                where: { userId },
                include: { department: true }
            })

            if (!employee) {
                return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
            }

            const employeeId = employee.id

            // 1. Attendance (Current Month)
            const attendanceCount = await prisma.attendance.count({
                where: {
                    employeeId,
                    date: {
                        gte: startOfMonth(new Date()),
                        lte: endOfMonth(new Date())
                    },
                    status: "PRESENT"
                }
            })

            // 2. Leave Balance
            const baseLeaves = 20
            const takenLeaves = await prisma.leave.count({
                where: {
                    employeeId,
                    status: "APPROVED"
                }
            })

            // 3. Pending Trainings
            const pendingTrainings = await prisma.trainingEnrollment.findMany({
                where: {
                    employeeId,
                    completed: false
                },
                include: { training: true }
            })

            // 4. Performance Review
            const nextReview = await prisma.performanceReview.findFirst({
                where: { employeeId },
                orderBy: { createdAt: "desc" }
            })

            // 5. Today's Schedule
            const schedule = await prisma.calendarEvent.findMany({
                where: {
                    start: {
                        gte: startOfToday(),
                        lte: endOfToday()
                    }
                }
            })

            // 6. Team Status
            const teammates = await prisma.employee.findMany({
                where: {
                    departmentId: employee.departmentId,
                    NOT: { id: employeeId }
                },
                take: 5
            })

            const teamStatus = await Promise.all(teammates.map(async (tm) => {
                const todayAttendance = await prisma.attendance.findFirst({
                    where: {
                        employeeId: tm.id,
                        date: {
                            gte: startOfToday(),
                            lte: endOfToday()
                        }
                    }
                })
                return {
                    initials: `${tm.firstName[0]}${tm.lastName[0]}`.toUpperCase(),
                    name: `${tm.firstName} ${tm.lastName}`,
                    status: todayAttendance ? (todayAttendance.checkOut ? "Offline" : "Active") : "Offline"
                }
            }))

            return NextResponse.json({
                role: "EMPLOYEE",
                stats: {
                    attendanceCount,
                    leaveBalance: baseLeaves - takenLeaves,
                    pendingTrainingCount: pendingTrainings.length,
                    reviewStatus: nextReview ? "Scheduled" : "Upcoming"
                },
                schedule: schedule.map(ev => ({
                    time: format(ev.start, "hh:mm a"),
                    title: ev.title,
                    type: ev.type,
                    color: ev.type === "MEETING" ? "border-l-4 border-blue-500" : "border-l-4 border-purple-500"
                })),
                teamStatus
            })
        }
    } catch (error) {
        console.error("[DASHBOARD_GET]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
