import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { attendanceSchema } from "@/lib/schemas"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/attendance – List attendance records (scoped)
export const GET = withAuth({ module: Module.ATTENDANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const date = searchParams.get("date")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, unknown> = { organizationId: ctx.organizationId }
        if (date) where.date = new Date(date)
        if (employeeId) where.employeeId = employeeId

        const records = await prisma.attendance.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: { select: { name: true } } } } },
            orderBy: { date: "desc" },
            take: 200,
        })

        return apiSuccess(records)
    } catch (error) {
        console.error("[ATTENDANCE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/attendance – Check in / Create record
export const POST = withAuth({ module: Module.ATTENDANCE, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = attendanceSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        let employeeId = parsed.data.employeeId
        if (!employeeId) {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
            })
            if (!employee) {
                return apiError("No employee profile linked to your account", ApiErrorCode.BAD_REQUEST, 400)
            }
            employeeId = employee.id
        } else if (!hasPermission(ctx.role, Module.ATTENDANCE, Action.UPDATE)) {
            return apiError("Only admins can create attendance for other employees", ApiErrorCode.FORBIDDEN, 403)
        }

        const record = await prisma.attendance.create({
            data: {
                date: parsed.data.date || new Date(),
                checkIn: parsed.data.checkIn || null,
                checkOut: parsed.data.checkOut || null,
                workHours: parsed.data.workHours || null,
                status: parsed.data.status || "PRESENT",
                employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: true },
        })

        return apiSuccess(record, undefined, 201)
    } catch (error) {
        console.error("[ATTENDANCE_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
