import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { queue } from "@/lib/queue"

// POST /api/worker/process-queue
// Use a secure secret in production to invoke this
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization")
        // In production, verify authHeader matching an environment secret
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized worker invocation" }, { status: 401 })
        }

        const job = await queue.dequeue()
        if (!job) {
            return NextResponse.json({ message: "Queue is empty", processed: 0 })
        }

        const { type, data: rawRows } = job
        const rows = (rawRows as any[]) || []

        let inserted = 0
        let skipped = 0

        if (type === "ATTENDANCE_IMPORT") {
            for (const row of rows) {
                try {
                    const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                    const employee = await prisma.employee.findFirst({
                        where: employeeCode
                            ? { employeeCode }
                            : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" } }
                    })
                    if (!employee) { skipped++; continue }

                    const dateRaw = String(row["date"] || row["Date"] || "").trim()
                    const date = dateRaw ? new Date(dateRaw) : null
                    if (!date || isNaN(date.getTime())) { skipped++; continue }

                    const checkInRaw = row["checkIn"] || row["Check In"]
                    const checkOutRaw = row["checkOut"] || row["Check Out"]
                    const checkIn = checkInRaw ? new Date(checkInRaw) : null
                    const checkOut = checkOutRaw ? new Date(checkOutRaw) : null
                    const workHours = parseFloat(String(row["workHours"] || row["Work Hours"] || 0)) || null
                    const statusRaw = String(row["status"] || row["Status"] || "PRESENT").trim().toUpperCase()
                    const validStatuses = ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "WEEKEND"]
                    const status = validStatuses.includes(statusRaw) ? statusRaw as any : "PRESENT"

                    await prisma.attendance.create({
                        data: {
                            employeeId: employee.id,
                            organizationId: employee.organizationId,
                            date,
                            checkIn: checkIn && !isNaN(checkIn.getTime()) ? checkIn : null,
                            checkOut: checkOut && !isNaN(checkOut.getTime()) ? checkOut : null,
                            workHours,
                            status,
                        }
                    })
                    inserted++
                } catch { skipped++ }
            }
        } else if (type === "PF_IMPORT") {
            for (const row of rows) {
                try {
                    const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                    const employee = await prisma.employee.findFirst({
                        where: employeeCode
                            ? { employeeCode }
                            : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" } }
                    })
                    if (!employee) { skipped++; continue }

                    const month = String(row["month"] || row["Month"] || "").trim()
                    const accountNumber = String(row["accountNumber"] || row["Account Number"] || "").trim()
                    const basicSalary = parseFloat(String(row["basicSalary"] || row["Basic Salary"] || 0))
                    const employeeContribution = parseFloat(String(row["employeeContribution"] || row["Employee Contribution"] || 0))
                    const employerContribution = parseFloat(String(row["employerContribution"] || row["Employer Contribution"] || 0))
                    const totalContribution = parseFloat(String(row["totalContribution"] || row["Total Contribution"] || 0)) || employeeContribution + employerContribution
                    const status = String(row["status"] || row["Status"] || "Credited").trim()

                    const existing = await prisma.providentFund.findFirst({
                        where: { employeeId: employee.id, month }
                    })

                    if (existing) {
                        await prisma.providentFund.update({
                            where: { id: existing.id },
                            data: { accountNumber, basicSalary, employeeContribution, employerContribution, totalContribution, status }
                        })
                    } else {
                        await prisma.providentFund.create({
                            data: { employeeId: employee.id, organizationId: employee.organizationId, month, accountNumber, basicSalary, employeeContribution, employerContribution, totalContribution, status }
                        })
                    }
                    inserted++
                } catch { skipped++ }
            }
        }

        return NextResponse.json({
            message: `Processed job ${job.id}`,
            jobId: job.id,
            type,
            processed: inserted + skipped,
            inserted,
            skipped,
            hasMore: true // Hint to the caller to invoke again if queue length is unknown
        })

    } catch (error) {
        console.error("[WORKER_ERROR]", error)
        return NextResponse.json({ error: "Failed to process job" }, { status: 500 })
    }
}
