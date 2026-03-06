import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { payrollSchema } from "@/lib/schemas"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/payroll – List payroll records (scoped)
export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const month = searchParams.get("month")
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, any> = { organizationId: ctx.organizationId }
        if (month) where.month = month

        if (!hasPermission(ctx.role, Module.PAYROLL, Action.CREATE)) {
            // Users without CREATE permission only see their own payroll
            if (ctx.employeeId) where.employeeId = ctx.employeeId
            else return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const records = await prisma.payroll.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
        })

        return apiSuccess(records)
    } catch (error) {
        console.error("[PAYROLL_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/payroll – Create payroll entry
export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = payrollSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const record = await prisma.payroll.create({
            data: {
                month: parsed.data.month,
                basicSalary: parsed.data.basicSalary,
                allowances: parsed.data.allowances ?? 0,
                arrears: parsed.data.arrears ?? 0,
                reimbursements: parsed.data.reimbursements ?? 0,
                loansAdvances: parsed.data.loansAdvances ?? 0,
                pfDeduction: parsed.data.pfDeduction ?? 0,
                tax: parsed.data.tax ?? 0,
                otherDed: parsed.data.otherDed ?? 0,
                netSalary: parsed.data.netSalary ?? 0,
                status: parsed.data.status || "PENDING",
                employeeId: parsed.data.employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: true },
        })

        return apiSuccess(record, undefined, 201)
    } catch (error) {
        console.error("[PAYROLL_POST]", error)
        return apiError("Internal Server Error", "INTERNAL_ERROR", 500)
    }
})
