import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { addDays, addWeeks, addMonths } from "date-fns"

// GET /api/cron/reports
// This endpoint should be called by an external cron service (e.g. hourly)
export const GET = async (req: Request) => {
    try {
        const now = new Date()

        // 1. Find active schedules that are due
        const dueSchedules = await prisma.reportSchedule.findMany({
            where: {
                isActive: true,
                nextRunAt: { lte: now }
            },
            include: {
                report: true
            }
        })

        console.log(`[CRON_REPORTS] Found ${dueSchedules.length} due reports.`)

        const results = []

        for (const schedule of dueSchedules) {
            try {
                const doc = await prisma.document.create({
                    data: {
                        title: `Scheduled Report: ${schedule.report.name} (${format(now, "yyyy-MM-dd")})`,
                        category: "POLICY",
                        url: `/api/reports/download/${schedule.id}`,
                        organizationId: schedule.organizationId,
                        isPublic: false
                    }
                })

                // 3. Update the schedule for the next run
                let nextRunAt = new Date(schedule.nextRunAt)
                if (schedule.frequency === "DAILY") nextRunAt = addDays(nextRunAt, 1)
                else if (schedule.frequency === "WEEKLY") nextRunAt = addWeeks(nextRunAt, 1)
                else if (schedule.frequency === "MONTHLY") nextRunAt = addMonths(nextRunAt, 1)

                await prisma.reportSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        lastRunAt: now,
                        nextRunAt
                    }
                })

                results.push({ id: schedule.id, status: "SUCCESS", docId: doc.id })
            } catch (err) {
                console.error(`[CRON_REPORTS] Failed for schedule ${schedule.id}:`, err)
                results.push({ id: schedule.id, status: "FAILED" })
            }
        }

        return NextResponse.json({ processed: results.length, details: results })

    } catch (error) {
        console.error("[CRON_REPORTS_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

function format(date: Date, str: string) {
    return date.toISOString().split("T")[0]
}
