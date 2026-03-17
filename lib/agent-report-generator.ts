import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { renderDailyReportEmail, type DailyReportData } from "@/lib/email-templates/daily-report"

const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const aiReportSchema = z.object({
    aiSummary: z.string().describe("2-3 sentence summary of the employee's day: productivity pattern, notable behaviors, and overall assessment."),
    aiRecommendations: z.array(z.string()).max(3).describe("1-3 actionable improvement suggestions based on the day's data."),
    focusScore: z.number().min(0).max(1).describe("0-1 score reflecting how focused the employee was (few app switches, long productive stretches)."),
})

/**
 * Helper to fetch JSON from Django API with error handling.
 */
async function djangoFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
    try {
        const response = await fetch(`${DJANGO_BASE}${path}`, {
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(10000),
            ...options,
        })
        if (!response.ok) return null
        const json = await response.json()
        return (json.data ?? json) as T
    } catch {
        return null
    }
}

/**
 * Generate a daily activity report for one employee.
 * Aggregates snapshots, app/website usage, idle events, runs AI analysis,
 * upserts DailyActivityReport via Django, and sends email.
 */
export async function generateDailyReport(employeeId: string, date: Date): Promise<string | null> {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const dateStr = dayStart.toISOString().split("T")[0]

    // Fetch employee info from Django
    const employee = await djangoFetch<{
        id: string; first_name: string; last_name: string
        organization_id: string; email?: string
    }>(`/api/v1/employees/${employeeId}/`)
    if (!employee) return null

    // Fetch aggregated activity data from Django
    const activityData = await djangoFetch<{
        total_active_seconds: number
        total_idle_seconds: number
        keystroke_count: number
        mouse_click_count: number
        avg_productivity_score: number
        snapshot_count: number
    }>(`/api/v1/agents/activity/aggregate/?employee_id=${employeeId}&date_start=${dayStart.toISOString()}&date_end=${dayEnd.toISOString()}`)

    const totalActive = activityData?.total_active_seconds ?? 0
    const totalIdle = activityData?.total_idle_seconds ?? 0
    const avgProductivity = activityData?.avg_productivity_score ?? 0
    const snapshotCount = activityData?.snapshot_count ?? 0
    const keystrokeCount = activityData?.keystroke_count ?? 0
    const mouseClickCount = activityData?.mouse_click_count ?? 0

    // Top apps
    const topApps = await djangoFetch<Array<{ app_name: string; total_seconds: number; category: string }>>(
        `/api/v1/agents/activity/top-apps/?employee_id=${employeeId}&date_start=${dayStart.toISOString()}&date_end=${dayEnd.toISOString()}&limit=5`
    ) ?? []

    // Top websites
    const topWebsites = await djangoFetch<Array<{ domain: string; total_seconds: number; category: string }>>(
        `/api/v1/agents/activity/top-websites/?employee_id=${employeeId}&date_start=${dayStart.toISOString()}&date_end=${dayEnd.toISOString()}&limit=5`
    ) ?? []

    // Idle events
    const idleEvents = await djangoFetch<Array<{ duration_sec: number; response: string; notes: string | null }>>(
        `/api/v1/agents/activity/idle-events/?employee_id=${employeeId}&date_start=${dayStart.toISOString()}&date_end=${dayEnd.toISOString()}`
    ) ?? []

    const idleNotes = idleEvents
        .filter(e => e.notes)
        .map(e => `${e.notes} (${e.response}, ${Math.round(e.duration_sec / 60)}m)`)

    // AI analysis
    let aiSummary = ""
    let aiRecommendations: string[] = []
    let focusScore = avgProductivity

    try {
        const prompt = `Analyze this employee's daily work activity and generate insights.

Employee: ${employee.first_name} ${employee.last_name}
Date: ${dateStr}

Activity Data:
- Active time: ${(totalActive / 3600).toFixed(1)} hours
- Idle time: ${(totalIdle / 3600).toFixed(1)} hours
- Keystrokes: ${keystrokeCount}
- Mouse clicks: ${mouseClickCount}
- Avg productivity score: ${(avgProductivity * 100).toFixed(0)}%
- Snapshots recorded: ${snapshotCount}

Top Apps: ${topApps.map(a => `${a.app_name}(${(a.total_seconds / 3600).toFixed(1)}h)`).join(", ") || "none"}
Top Websites: ${topWebsites.map(w => `${w.domain}(${(w.total_seconds / 3600).toFixed(1)}h)`).join(", ") || "none"}
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

    // Normalize top apps/websites to camelCase for email template
    const topAppsCamel = topApps.map(a => ({ appName: a.app_name, totalSeconds: a.total_seconds, category: a.category }))
    const topWebsitesCamel = topWebsites.map(w => ({ domain: w.domain, totalSeconds: w.total_seconds, category: w.category }))

    // Upsert DailyActivityReport via Django
    const reportResponse = await djangoFetch<{ id: string }>(`/api/v1/agents/activity/daily-report/`, {
        method: "POST",
        body: JSON.stringify({
            employee_id: employeeId,
            organization_id: employee.organization_id,
            date: dateStr,
            total_active_seconds: totalActive,
            total_idle_seconds: totalIdle,
            total_break_seconds: 0,
            total_session_seconds: totalActive + totalIdle,
            productivity_score: avgProductivity,
            focus_score: focusScore,
            snapshot_count: snapshotCount,
            idle_event_count: idleEvents.length,
            top_apps: topAppsCamel,
            top_websites: topWebsitesCamel,
            ai_summary: aiSummary,
            ai_recommendations: aiRecommendations.join("\n"),
        }),
    })

    if (!reportResponse) return null

    // Send email
    const employeeEmail = employee.email
    if (employeeEmail) {
        const emailData: DailyReportData = {
            employeeName: `${employee.first_name} ${employee.last_name}`,
            date: dateStr,
            totalActiveHours: totalActive / 3600,
            totalIdleHours: totalIdle / 3600,
            totalBreakHours: 0,
            productivityScore: avgProductivity,
            focusScore,
            topApps: topAppsCamel,
            topWebsites: topWebsitesCamel,
            idleNotes,
            aiSummary,
            aiRecommendations,
        }

        const html = renderDailyReportEmail(emailData)
        await sendEmail({
            to: employeeEmail,
            subject: `Daily Activity Report — ${dateStr}`,
            html,
        })

        // Mark email sent via Django
        await djangoFetch(`/api/v1/agents/activity/daily-report/${reportResponse.id}/email-sent/`, {
            method: "POST",
        })
    }

    return reportResponse.id
}
