import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { providentFundSchema } from "@/lib/schemas"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/pf – List provident fund records (scoped)
export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        const where: Record<string, any> = { organizationId: ctx.organizationId }

        if (!hasPermission(ctx.role, Module.PAYROLL, Action.CREATE)) {
            // Users without CREATE permission only see their own PF records
            if (ctx.employeeId) where.employeeId = ctx.employeeId
            else return apiError("No employee profile found", ApiErrorCode.BAD_REQUEST, 400)
        } else if (employeeId) {
            where.employeeId = employeeId
        }

        const records = await prisma.providentFund.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { createdAt: "desc" },
            take: 200,
        })

        return apiSuccess(records)
    } catch (error) {
        console.error("[PF_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/pf – Create PF record
export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = providentFundSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const record = await prisma.providentFund.create({
            data: {
                month: parsed.data.month,
                accountNumber: parsed.data.accountNumber,
                basicSalary: parsed.data.basicSalary,
                employeeContribution: parsed.data.employeeContribution,
                employerContribution: parsed.data.employerContribution,
                totalContribution: parsed.data.totalContribution,
                status: parsed.data.status,
                employeeId: parsed.data.employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: true },
        })

        return apiSuccess(record, undefined, 201)
    } catch (error) {
        console.error("[PF_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
