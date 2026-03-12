import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

// POST /api/payroll/import
// Body: { rows: Array<{ employeeCode|employeeName, month, basicSalary, allowances, arrears, reimbursements, loansAdvances, pfDeduction, tax, otherDed, netSalary, status }> }
export const POST = withAuth({ module: Module.PAYROLL, action: Action.IMPORT }, async (req, ctx) => {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided" }, { status: 400 })
        }

        const orgId = ctx.organizationId
        let inserted = 0
        let skipped = 0

        for (const row of rows) {
            try {
                // Find employee by code or name
                const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                const employee = await prisma.employee.findFirst({
                    where: {
                        organizationId: orgId,
                        deletedAt: null,
                        ...(employeeCode
                            ? { employeeCode }
                            : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" } })
                    }
                })
                if (!employee) { skipped++; continue }

                const basicSalary = parseFloat(String(row["basicSalary"] || row["Basic Salary"] || 0))
                const allowances = parseFloat(String(row["allowances"] || row["Allowances"] || 0))
                const arrears = parseFloat(String(row["arrears"] || row["Arrears"] || 0))
                const reimbursements = parseFloat(String(row["reimbursements"] || row["Reimbursements"] || 0))
                const loansAdvances = parseFloat(String(row["loansAdvances"] || row["Loans/Advances"] || 0))

                const pfDeduction = parseFloat(String(row["pfDeduction"] || row["PF Deduction"] || 0))
                const tax = parseFloat(String(row["tax"] || row["Tax"] || 0))
                const otherDed = parseFloat(String(row["otherDed"] || row["Other Deductions"] || 0))

                const netSalary = parseFloat(String(row["netSalary"] || row["Net Salary"] || 0)) ||
                    basicSalary + allowances + arrears + reimbursements - pfDeduction - tax - otherDed - loansAdvances

                const month = String(row["month"] || row["Month"] || "").trim()
                const statusRaw = String(row["status"] || row["Status"] || "PENDING").trim().toUpperCase()
                const status = ["PENDING", "PROCESSED", "PAID"].includes(statusRaw) ? statusRaw as "PENDING" | "PROCESSED" | "PAID" : "PENDING"

                // K10: Upsert — prevent duplicate records on re-import
                const existing = await prisma.payroll.findFirst({
                    where: { employeeId: employee.id, month, organizationId: orgId }
                })

                const data = {
                    basicSalary, allowances, arrears, reimbursements, loansAdvances,
                    pfDeduction, tax, otherDed, netSalary, status
                }

                if (existing) {
                    // Prevent overwriting finalized payroll records
                    if (existing.isFinalized) { skipped++; continue }
                    await prisma.payroll.update({
                        where: { id: existing.id },
                        data
                    })
                } else {
                    await prisma.payroll.create({
                        data: { ...data, employeeId: employee.id, month, organizationId: orgId }
                    })
                }
                inserted++
            } catch { skipped++ }
        }

        return NextResponse.json({ inserted, skipped })
    } catch (error) {
        console.error("[PAYROLL_IMPORT]", error)
        return NextResponse.json({ error: "Import failed" }, { status: 500 })
    }
})
