import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action, hasPermission } from "@/lib/permissions"

export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const payroll = (await prisma.payroll.findUnique({
            where: { id, organizationId: ctx.organizationId },
            include: { employee: true, organization: true }
        })) as any

        if (!payroll) {
            return new NextResponse("Payslip Not Found", { status: 404 })
        }

        // Access Control: Users with UPDATE permission (admin-level) can see all,
        // others can only see their own payslip
        if (!hasPermission(ctx.role, Module.PAYROLL, Action.UPDATE) && payroll.employee.userId !== ctx.userId) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const additions = (payroll.basicSalary + payroll.allowances + payroll.arrears + payroll.reimbursements).toFixed(2)
        const deductions = (payroll.pfDeduction + payroll.tax + payroll.otherDed + payroll.loansAdvances).toFixed(2)

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payslip - ${payroll.month}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
                .payslip-container { border: 1px solid #e2e8f0; padding: 40px; border-radius: 8px; background: #fff; }
                .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                h1 { margin: 0; color: #1e293b; font-size: 24px; text-transform: uppercase; }
                .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
                .section { margin-bottom: 30px; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 14px; }
                .details-grid div strong { color: #475569; display: inline-block; width: 140px; }
                table { w-full; width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
                th, td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; }
                th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 12px; }
                .amount-col { text-align: right; }
                .totals { font-weight: bold; background: #f1f5f9; }
                .net-pay { margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: right; font-size: 20px; font-weight: bold; color: #0f172a; }
                .badge { display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: bold; border-radius: 99px; margin-top: 10px; }
                .badge-final { background: #dcfce7; color: #166534; }
                .badge-draft { background: #ffedd5; color: #9a3412; }
                @media print {
                    body { padding: 0; }
                    .payslip-container { border: none; padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Download PDF / Print</button>
            </div>

            <div class="payslip-container">
                <div class="header">
                    <h1>${payroll.organization.name}</h1>
                    <div class="subtitle">Payslip for the month of <strong>${payroll.month}</strong></div>
                    <div class="badge ${payroll.isFinalized ? 'badge-final' : 'badge-draft'}">
                        ${payroll.isFinalized ? 'FINALIZED (IMMUTABLE)' : 'DRAFT'}
                    </div>
                </div>

                <div class="section details-grid">
                    <div>
                        <div><strong>Employee Name:</strong> ${payroll.employee.firstName} ${payroll.employee.lastName}</div>
                        <div><strong>Employee Code:</strong> ${payroll.employee.employeeCode}</div>
                        <div><strong>Designation:</strong> ${payroll.employee.designation}</div>
                    </div>
                    <div>
                        <div><strong>Date of Joining:</strong> ${new Date(payroll.employee.dateOfJoining).toLocaleDateString()}</div>
                        <div><strong>Payment Status:</strong> ${payroll.status}</div>
                    </div>
                </div>

                <div class="section">
                    <table>
                        <thead>
                            <tr>
                                <th>Earnings</th>
                                <th class="amount-col">Amount</th>
                                <th>Deductions</th>
                                <th class="amount-col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Basic Salary</td>
                                <td class="amount-col">₹${payroll.basicSalary.toFixed(2)}</td>
                                <td>Provident Fund (PF)</td>
                                <td class="amount-col">₹${payroll.pfDeduction.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Allowances</td>
                                <td class="amount-col">₹${payroll.allowances.toFixed(2)}</td>
                                <td>Income Tax</td>
                                <td class="amount-col">₹${payroll.tax.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Arrears</td>
                                <td class="amount-col">₹${payroll.arrears.toFixed(2)}</td>
                                <td>Loans & Advances</td>
                                <td class="amount-col">₹${payroll.loansAdvances.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Reimbursements</td>
                                <td class="amount-col">₹${payroll.reimbursements.toFixed(2)}</td>
                                <td>Other Deductions</td>
                                <td class="amount-col">₹${payroll.otherDed.toFixed(2)}</td>
                            </tr>
                            <tr class="totals">
                                <td>Total Earnings</td>
                                <td class="amount-col">₹${additions}</td>
                                <td>Total Deductions</td>
                                <td class="amount-col">₹${deductions}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="net-pay">
                    Net Pay: ₹${payroll.netSalary.toFixed(2)}
                </div>

                <div style="margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 20px;">
                    This is a system generated payslip and does not require a physical signature.<br/>
                    Generated on ${new Date().toLocaleString()} | ID: ${payroll.id}
                </div>
            </div>
        </body>
        </html>
        `

        return new NextResponse(html, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        })
    } catch (err: any) {
        return new NextResponse("Internal Server Error", { status: 500 })
    }
})
