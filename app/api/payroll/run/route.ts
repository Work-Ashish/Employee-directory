import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError } from "@/lib/api-response"
import { payrollRunSchema } from "@/lib/schemas/payroll"
import { calculateNetSalary, calculatePFContributions, calculateDynamicTax } from "@/lib/payroll-engine"
import { Module, Action } from "@/lib/permissions"

export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = payrollRunSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(apiError("Validation Error", "VALIDATION_ERROR", 400, parsed.error.format()), { status: 400 })
        }

        const { employeeId, month, basicSalary, allowances, arrears, reimbursements, loansAdvances, otherDed } = parsed.data

        // 1. Fetch active compliance config
        const config = await prisma.payrollComplianceConfig.findFirst({
            where: { organizationId: ctx.organizationId, isActive: true },
            include: { taxSlabs: true }
        })

        if (!config || !config.taxSlabs.length) {
            return NextResponse.json(apiError("Active Payroll Compliance Configuration and Tax Slabs are required to run payroll.", "BAD_REQUEST", 400), { status: 400 })
        }

        // 2. Perform advanced calculations
        const pf = calculatePFContributions(basicSalary, config.pfPercentage)

        // Annualize for tax (simplified assumption basic*12)
        const annualizedIncome = (basicSalary + allowances) * 12
        const taxDetails = calculateDynamicTax(annualizedIncome, config)

        const netSalary = calculateNetSalary({
            basicSalary,
            allowances,
            arrears,
            reimbursements,
            pfDeduction: pf.employeeContribution,
            tax: taxDetails.taxAmount,
            otherDed,
            loansAdvances
        })

        // 3. Persist payroll and log audit trail
        const record = await prisma.$transaction(async (tx) => {
            const payroll = await tx.payroll.create({
                data: {
                    month,
                    basicSalary,
                    allowances,
                    arrears,
                    reimbursements,
                    pfDeduction: pf.employeeContribution,
                    tax: taxDetails.taxAmount,
                    otherDed,
                    loansAdvances,
                    netSalary,
                    status: "PENDING",
                    employeeId,
                    organizationId: ctx.organizationId,
                }
            })

            // Store an audit event tracking the run parameters
            const auditDetails = JSON.stringify({
                configUsed: config.id,
                pfPercentage: config.pfPercentage,
                taxEffectiveRate: taxDetails.effectiveRate,
                grossAdditions: basicSalary + allowances + arrears + reimbursements,
                totalCalculatedDeductions: pf.employeeContribution + taxDetails.taxAmount + otherDed + loansAdvances
            })

            await tx.payrollAudit.create({
                data: {
                    payrollId: payroll.id,
                    action: "RUN_CALCULATION",
                    actorId: ctx.userId,
                    details: auditDetails,
                    organizationId: ctx.organizationId
                }
            })

            return payroll
        })

        return NextResponse.json(apiSuccess(record), { status: 201 })
    } catch (err: any) {
        return NextResponse.json(apiError("Internal Server Error", "INTERNAL_ERROR", 500, err), { status: 500 })
    }
})
