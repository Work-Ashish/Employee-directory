import { prisma } from "@/lib/prisma"
import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { renderDailyReportEmail, type DailyReportData } from "@/lib/email-templates/daily-report"

const aiReportSchema = z.object({
    aiSummary: z.string().describe("2-3 sentence summary of the employee's day: productivity pattern, notable behaviors, and overall assessment."),
    aiRecommendations: z.array(z.string()).max(3).describe("1-3 actionable improvement suggestions based on the day's data."),
    focusScore: z.number().min(0).max(1).describe("0-1 score reflecting how focused the employee was (few app switches, long productive stretches)."),
})

/**
 * Generate a daily activity report for one employee.
 * Aggregates snapshots, app/website usage, idle events, runs AI analysis,
 * upserts DailyActivityReport, and sends email.
 */
export async function generateDailyReport(employeeId: string, date: Date): Promise<string | null> {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, firstName: true, lastName: true, organizationId: true, user: { select: { email: true } } },
    })
    if (!employee) return null

    // Aggregate activity snapshots
    const agg = await prisma.agentActivitySnapshot.aggregate({
        where: { device: { employeeId }, timestamp: { gte: dayStart, lte: dayEnd } },
        _sum: { activeSeconds: true, idleSeconds: true, keystrokeCount: true, mouseClickCount: true },
        _avg: { productivityScore: true },
        _count: true,
    })

    const totalActive = agg._sum.activeSeconds ?? 0
    const totalIdle = agg._sum.idleSeconds ?? 0

    // Top apps
    const topApps = await prisma.appUsageSummary.findMany({
        where: { employeeId, date: { gte: dayStart, lte: dayEnd } },
        orderBy: { totalSeconds: "desc" },
        take: 5,
        select: { appName: true, totalSeconds: true, category: true },
    })

    // Top websites
    const topWebsites = await prisma.websiteUsageSummary.findMany({
        where: { employeeId, date: { gte: dayStart, lte: dayEnd } },
        orderBy: { totalSeconds: "desc" },
        take: 5,
        select: { domain: true, totalSeconds: true, category: true },
    })

    // Idle events
    const idleEvents = await prisma.idleEvent.findMany({
        where: { employeeId, createdAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { createdAt: "asc" },
        select: { durationSec: true, response: true, notes: true },
    })

    const idleNotes = idleEvents
        .filter(e => e.notes)
        .map(e => `${e.notes} (${e.response}, ${Math.round(e.durationSec / 60)}m)`)

    const avgProductivity = agg._avg.productivityScore ?? 0

    // AI analysis
    let aiSummary = ""
    let aiRecommendations: string[] = []
    let focusScore = avgProductivity

    try {
        const prompt = `Analyze this employee's daily work activity and generate insights.

Employee: ${employee.firstName} ${employee.lastName}
Date: ${dayStart.toISOString().split("T")[0]}

Activity Data:
- Active time: ${(totalActive / 3600).toFixed(1)} hours
- Idle time: ${(totalIdle / 3600).toFixed(1)} hours
- Keystrokes: ${agg._sum.keystrokeCount ?? 0}
- Mouse clicks: ${agg._sum.mouseClickCount ?? 0}
- Avg productivity score: ${(avgProductivity * 100).toFixed(0)}%
- Snapshots recorded: ${agg._count}

Top Apps: ${topApps.map(a => `${a.appName}(${(a.totalSeconds / 3600).toFixed(1)}h)`).join(", ") || "none"}
Top Websites: ${topWebsites.map(w => `${w.domain}(${(w.totalSeconds / 3600).toFixed(1)}h)`).join(", ") || "none"}
Idle events: ${idleEvents.length} (${idleNotes.length} with notes)

Instructions:
- Be concise and professional
- Focus on patterns, not judgment
- Suggest actionable improvements`

        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: aiReportSchema,
            prompt,
        })

        aiSummary = object.aiSummary
        aiRecommendations = object.aiRecommendations
        focusScore = object.focusScore
    } catch (err) {
        console.error("[AI_REPORT_ERROR]", err)
        aiSummary = "AI analysis unavailable for this report."
    }

    // Upsert DailyActivityReport
    const dateOnly = dayStart.toISOString().split("T")[0]
    const report = await prisma.dailyActivityReport.upsert({
        where: { employeeId_date: { employeeId, date: dayStart } },
        create: {
            employeeId,
            organizationId: employee.organizationId,
            date: dayStart,
            totalActiveSeconds: totalActive,
            totalIdleSeconds: totalIdle,
            totalBreakSeconds: 0,
            totalSessionSeconds: totalActive + totalIdle,
            productivityScore: avgProductivity,
            focusScore,
            snapshotCount: agg._count,
            idleEventCount: idleEvents.length,
            topApps: topApps as any,
            topWebsites: topWebsites as any,
            aiSummary,
            aiRecommendations: aiRecommendations.join("\n"),
        },
        update: {
            totalActiveSeconds: totalActive,
            totalIdleSeconds: totalIdle,
            totalSessionSeconds: totalActive + totalIdle,
            productivityScore: avgProductivity,
            focusScore,
            snapshotCount: agg._count,
            idleEventCount: idleEvents.length,
            topApps: topApps as any,
            topWebsites: topWebsites as any,
            aiSummary,
            aiRecommendations: aiRecommendations.join("\n"),
        },
    })

    // Send email
    if (employee.user?.email) {
        const emailData: DailyReportData = {
            employeeName: `${employee.firstName} ${employee.lastName}`,
            date: dateOnly,
            totalActiveHours: totalActive / 3600,
            totalIdleHours: totalIdle / 3600,
            totalBreakHours: 0,
            productivityScore: avgProductivity,
            focusScore,
            topApps,
            topWebsites,
            idleNotes,
            aiSummary,
            aiRecommendations,
        }

        const html = renderDailyReportEmail(emailData)
        await sendEmail({
            to: employee.user.email,
            subject: `Daily Activity Report — ${dateOnly}`,
            html,
        })

        await prisma.dailyActivityReport.update({
            where: { id: report.id },
            data: { emailSentAt: new Date() },
        })
    }

    return report.id
}
