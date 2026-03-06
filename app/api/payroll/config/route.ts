import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError } from "@/lib/api-response"
import { payrollConfigSchema } from "@/lib/schemas/payroll"
import { Module, Action } from "@/lib/permissions"

// GET /api/payroll/config - Get active compliance configuration
export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, async (req, ctx) => {
    try {
        const config = await prisma.payrollComplianceConfig.findFirst({
            where: { organizationId: ctx.organizationId, isActive: true },
            include: { taxSlabs: { orderBy: { minIncome: 'asc' } } }
        })

        return NextResponse.json(apiSuccess(config || {}))
    } catch (err: any) {
        return NextResponse.json(apiError("Internal Server Error", "INTERNAL_ERROR", 500), { status: 500 })
    }
})

// POST /api/payroll/config - Update or create compliance configuration
export const POST = withAuth({ module: Module.PAYROLL, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = payrollConfigSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(apiError("Validation Error", "VALIDATION_ERROR", 400, parsed.error.format()), { status: 400 })
        }

        const { taxSlabs, ...configData } = parsed.data

        const result = await prisma.$transaction(async (tx) => {
            // Deactivate existing
            await tx.payrollComplianceConfig.updateMany({
                where: { organizationId: ctx.organizationId },
                data: { isActive: false }
            })

            // Create new config
            return tx.payrollComplianceConfig.create({
                data: {
                    ...configData,
                    organizationId: ctx.organizationId,
                    taxSlabs: taxSlabs?.length ? {
                        create: taxSlabs.map(s => ({
                            minIncome: s.minIncome,
                            maxIncome: s.maxIncome,
                            taxRate: s.taxRate,
                            baseTax: s.baseTax
                        }))
                    } : undefined
                },
                include: { taxSlabs: true }
            })
        })

        return NextResponse.json(apiSuccess(result), { status: 201 })
    } catch (err: any) {
        return NextResponse.json(apiError("Internal Server Error", "INTERNAL_ERROR", 500, err), { status: 500 })
    }
})
