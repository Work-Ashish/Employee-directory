import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError } from "@/lib/api-response"
import { calculateNetSalary } from "@/lib/payroll-engine"
import { Module, Action } from "@/lib/permissions"

export const PUT = withAuth({ module: Module.PAYROLL, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const payrollRecord = await prisma.payroll.findUnique({
            where: { id, organizationId: ctx.organizationId }
        })

        if (!payrollRecord) {
            return NextResponse.json(apiError("Record not found", "NOT_FOUND", 404), { status: 404 })
        }

        if (payrollRecord.isFinalized) {
            return NextResponse.json(apiError("Record is finalized and immutable", "FORBIDDEN", 403), { status: 403 })
        }

        const body = await req.json()
        const { action, manualOverride } = body

        if (action === "FINALIZE") {
            return await prisma.$transaction(async (tx) => {
                const updated = await tx.payroll.update({
                    where: { id },
                    data: { isFinalized: true, status: "PROCESSED" }
                })

                await tx.payrollAudit.create({
                    data: {
                        payrollId: id,
                        action: "FINALIZED",
                        actorId: ctx.userId,
                        details: "Payroll run marked as finalized and locked.",
                        organizationId: ctx.organizationId
                    }
                })

                return NextResponse.json(apiSuccess(updated))
            })
        }

        if (action === "MANUAL_OVERRIDE" && manualOverride) {
            // Calculate new net salary based on manual adjustments
            const netSalary = calculateNetSalary({
                basicSalary: manualOverride.basicSalary ?? payrollRecord.basicSalary,
                allowances: manualOverride.allowances ?? payrollRecord.allowances,
                arrears: manualOverride.arrears ?? payrollRecord.arrears,
                reimbursements: manualOverride.reimbursements ?? payrollRecord.reimbursements,
                pfDeduction: manualOverride.pfDeduction ?? payrollRecord.pfDeduction,
                tax: manualOverride.tax ?? payrollRecord.tax,
                otherDed: manualOverride.otherDed ?? payrollRecord.otherDed,
                loansAdvances: manualOverride.loansAdvances ?? payrollRecord.loansAdvances
            })

            return await prisma.$transaction(async (tx) => {
                const updated = await tx.payroll.update({
                    where: { id },
                    data: {
                        basicSalary: manualOverride.basicSalary,
                        allowances: manualOverride.allowances,
                        arrears: manualOverride.arrears,
                        reimbursements: manualOverride.reimbursements,
                        pfDeduction: manualOverride.pfDeduction,
                        tax: manualOverride.tax,
                        otherDed: manualOverride.otherDed,
                        loansAdvances: manualOverride.loansAdvances,
                        netSalary
                    }
                })

                await tx.payrollAudit.create({
                    data: {
                        payrollId: id,
                        action: "MANUAL_OVERRIDE",
                        actorId: ctx.userId,
                        details: JSON.stringify(manualOverride),
                        organizationId: ctx.organizationId
                    }
                })

                return NextResponse.json(apiSuccess(updated))
            })
        }

        return NextResponse.json(apiError("Invalid action or payload", "BAD_REQUEST", 400), { status: 400 })

    } catch (err: any) {
        return NextResponse.json(apiError("Internal Server Error", "INTERNAL_ERROR", 500, err), { status: 500 })
    }
})
