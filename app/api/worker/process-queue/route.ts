import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { queue } from "@/lib/queue"
import { createHmacSignature } from "@/lib/webhooks"
import { generateDailyReport } from "@/lib/agent-report-generator"

// POST /api/worker/process-queue
// Use a secure secret in production to invoke this
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization")
        // In production, verify authHeader matching an environment secret
        if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
            const { rows: importRows, organizationId } = (rawRows as any) || {}
            const attendanceRows = Array.isArray(importRows) ? importRows : rows
            for (const row of attendanceRows) {
                try {
                    const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                    const employee = await prisma.employee.findFirst({
                        where: {
                            ...(organizationId ? { organizationId } : {}),
                            deletedAt: null,
                            ...(employeeCode
                                ? { employeeCode }
                                : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" as const } })
                        }
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
            const { rows: pfRows, organizationId: pfOrgId } = (rawRows as any) || {}
            const pfImportRows = Array.isArray(pfRows) ? pfRows : rows
            for (const row of pfImportRows) {
                try {
                    const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                    const employee = await prisma.employee.findFirst({
                        where: {
                            ...(pfOrgId ? { organizationId: pfOrgId } : {}),
                            deletedAt: null,
                            ...(employeeCode
                                ? { employeeCode }
                                : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" as const } })
                        }
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
        } else if (type === "WEBHOOK_DELIVERY") {
            const { deliveryId, webhookUrl, secret, payload } = rawRows as any
            const payloadString = JSON.stringify(payload)
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "X-EMS-Event": (payload as any).event,
                "X-EMS-Delivery": (payload as any).id,
            }

            if (secret) {
                headers["X-EMS-Signature"] = createHmacSignature(payloadString, secret)
            }

            try {
                const response = await fetch(webhookUrl, {
                    method: "POST",
                    headers,
                    body: payloadString,
                })

                const responseBody = await response.text()

                await prisma.webhookDelivery.update({
                    where: { id: deliveryId },
                    data: {
                        responseCode: response.status,
                        responseBody: responseBody.slice(0, 1000),
                        status: response.ok ? "SUCCESS" : "FAILED",
                    }
                })

                if (!response.ok) {
                    const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } })
                    if (delivery && delivery.retryCount < 5) {
                        await prisma.webhookDelivery.update({
                            where: { id: deliveryId },
                            data: {
                                retryCount: { increment: 1 },
                                nextRetryAt: new Date(Date.now() + Math.pow(2, delivery.retryCount + 1) * 60 * 1000)
                            }
                        })
                    }
                }
                inserted++
            } catch (error: any) {
                console.error("[WEBHOOK_DELIVERY_ERROR]", error)
                await prisma.webhookDelivery.update({
                    where: { id: deliveryId },
                    data: {
                        status: "FAILED",
                        responseBody: error.message,
                        nextRetryAt: new Date(Date.now() + 60 * 1000)
                    }
                })
                skipped++
            }
        } else if (type === "AGENT_REPORT_GENERATE") {
            const { employeeId, date } = rawRows as any
            try {
                await generateDailyReport(employeeId, new Date(date))
                inserted++
            } catch {
                skipped++
            }
        } else if (type === "AGENT_AGGREGATE") {
            // Delegate to the cron endpoint logic inline
            try {
                const { date: aggDate } = rawRows as any
                const d = new Date(aggDate)
                d.setHours(0, 0, 0, 0)
                const dEnd = new Date(d)
                dEnd.setHours(23, 59, 59, 999)

                const snapshots = await prisma.agentActivitySnapshot.findMany({
                    where: { timestamp: { gte: d, lte: dEnd } },
                    include: { device: { select: { employeeId: true, organizationId: true } } },
                })

                for (const snap of snapshots) {
                    if (snap.primaryApp) {
                        await prisma.appUsageSummary.upsert({
                            where: { employeeId_date_appName: { employeeId: snap.device.employeeId, date: d, appName: snap.primaryApp } },
                            create: { employeeId: snap.device.employeeId, organizationId: snap.device.organizationId, date: d, appName: snap.primaryApp, category: snap.category, totalSeconds: snap.activeSeconds },
                            update: { totalSeconds: { increment: snap.activeSeconds } },
                        })
                    }
                }
                inserted++
            } catch {
                skipped++
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
