import { NextResponse } from "next/server"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { subDays } from "date-fns"

export const GET = withAuth({ module: Module.PERFORMANCE, action: Action.VIEW }, async (req, ctx) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is missing." }, { status: 500 })
        }

        const sevenDaysAgo = subDays(new Date(), 7)

        // Use raw SQL aggregation with organization scope
        const stats: any[] = await prisma.$queryRaw`
            SELECT
                e.id,
                e."firstName",
                e."lastName",
                e."departmentId",
                COALESCE(SUM(a."workHours"), 0)::float as "totalWorkHours",
                COALESCE(SUM(ts."totalIdle"), 0)::int as "totalIdleSeconds",
                COUNT(DISTINCT ts.id)::int as "sessionCount"
            FROM "Employee" e
            LEFT JOIN "Attendance" a ON a."employeeId" = e.id AND a.date >= ${sevenDaysAgo}
            LEFT JOIN "TimeSession" ts ON ts."employeeId" = e.id AND ts."createdAt" >= ${sevenDaysAgo}
            WHERE e."organizationId" = ${ctx.organizationId}
            GROUP BY e.id, e."firstName", e."lastName", e."departmentId"
            HAVING COALESCE(SUM(a."workHours"), 0) > 0 OR COUNT(ts.id) > 0
            LIMIT 500
        `

        if (stats.length === 0) {
            return NextResponse.json({ report: "No employee data found for the last 7 days." })
        }

        const rawAnalytics = stats.map(emp => ({
            name: `${emp.firstName} ${emp.lastName}`,
            departmentId: emp.departmentId,
            totalWorkHoursOver7Days: Math.round(emp.totalWorkHours * 10) / 10,
            totalIdleMinutes: Math.floor(emp.totalIdleSeconds / 60),
            isOverworked: emp.totalWorkHours > 50,
            sessionCount: emp.sessionCount,
        }))

        const systemInstruction = `You are a Senior HR Analytics AI Agent. 
Your job is to analyze raw employee time and activity data from the last 7 days and write a comprehensive, actionable Team Health & Burnout Report in Markdown format.

Focus on:
1. Identifying employees at risk of burnout (>50 hours a week).
2. Highlighting highly productive individuals.
3. Noticing any concerning patterns (e.g., massive idle time paired with low work hours).
4. Summarizing overall team health.

Be professional, empathetic, and strictly base your analysis on the provided JSON data. Do not invent names or statistics. Output ONLY valid Markdown.`

        let analyticsJson = JSON.stringify(rawAnalytics, null, 2)
        if (analyticsJson.length > 30000) {
            const sorted = rawAnalytics.sort((a, b) => b.totalWorkHoursOver7Days - a.totalWorkHoursOver7Days)
            analyticsJson = JSON.stringify(sorted.slice(0, 100), null, 2)
        }

        const prompt = `Here is the aggregated telemetry data for the team over the last 7 days:

${analyticsJson}

Please generate the "Weekly Team Health & Productivity Report".`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)

        try {
            const { text } = await generateText({
                model: google("gemini-2.0-flash"),
                system: systemInstruction,
                prompt,
                abortSignal: controller.signal,
            })

            return NextResponse.json({ report: text })
        } finally {
            clearTimeout(timeout)
        }

    } catch (error: any) {
        console.error("[BURNOUT_ANALYTICS_GET]", error)
        if (error?.name === "AbortError") {
            return NextResponse.json({ error: "Report generation timed out. Please try again." }, { status: 504 })
        }
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
    }
})
