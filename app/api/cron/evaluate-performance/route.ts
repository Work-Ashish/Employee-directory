import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import crypto from "crypto"

export const maxDuration = 300 // 5 minutes max on Vercel Pro

const aiEvaluationSchema = z.object({
    aiAdjustment: z.number().min(-20).max(20).describe("Score adjustment based on qualitative sentiment"),
    confidenceScore: z.number().min(0).max(1).describe("AI confidence in its evaluation"),
    burnoutRisk: z.boolean().describe("Is this employee showing signs of burnout (overworking consistently)?"),
    behavioralAnomaly: z.boolean().describe("Is there a sudden negative behavioral shift?"),
    aiFeedback: z.string().describe("Personalized feedback/appreciation message to the employee. Tone: empathetic, professional."),
})

export async function POST(req: Request) {
    try {
        // Simple security layer for cron or manual triggers
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const now = new Date()
        const weekNumber = getWeekNumber(now)
        const year = now.getFullYear()

        // Find week start date (Monday)
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        const weekStartDate = new Date(now.setDate(diff))
        weekStartDate.setHours(0, 0, 0, 0)

        const batchId = crypto.randomUUID()

        console.log(`[AGENT] Starting evaluation matrix for Week ${weekNumber}, ${year} (Batch: ${batchId})`)

        const employees = await prisma.employee.findMany({
            where: { status: "ACTIVE", deletedAt: null },
            include: { user: true },
            take: 50 // Chunk for demo safety
        })

        let processed = 0
        let errors = 0

        for (const emp of employees) {
            try {
                const evaluationHash = `${emp.id}_${year}_W${weekNumber}`

                // Idempotency Check
                const existing = await prisma.weeklyScores.findUnique({
                    where: { evaluationHash }
                })
                if (existing) continue // Skip if already evaluated

                // 1. Gather Telemetry (Last 7 Days)
                const sessions = await prisma.timeSession.findMany({
                    where: {
                        employeeId: emp.id,
                        checkIn: { gte: weekStartDate }
                    }
                })

                let activeSec = 0
                let idleSec = 0
                sessions.forEach(s => {
                    activeSec += s.totalWork || 0
                    idleSec += s.totalIdle || 0
                })

                // Rule-based Base Score calculation
                // Assume 40 hours = 144,000 seconds is perfect (score 100)
                const hoursWorked = activeSec / 3600
                let baseScore = Math.min((hoursWorked / 40) * 100, 100)

                // Penalize high idle time (> 20% of active time)
                if (activeSec > 0 && idleSec / activeSec > 0.2) {
                    baseScore -= 10
                }

                // AI Processing Pipeline
                const prompt = `
                    Evaluate employee performance for Week ${weekNumber}.
                    
                    Data Inputs:
                    - Role: ${emp.designation}
                    - Base Score Calculated: ${baseScore.toFixed(1)}/100
                    - Active Hours: ${hoursWorked.toFixed(1)}
                    - Idle Hours: ${(idleSec / 3600).toFixed(1)}

                    Instructions:
                    1. Generate a personalized feedback paragraph (keep it concise, max 3 sentences).
                    2. If Base Score is > 90, be appreciative. If < 60, focus on constructive improvement. 
                    3. Determine burnout risk (if working > 50 hours).
                    4. Output a confidence score (0.0 to 1.0).
                `

                const { object } = await generateObject({
                    model: google("gemini-2.5-flash"),
                    schema: aiEvaluationSchema,
                    prompt: prompt,
                })

                const finalScore = Math.min(Math.max((baseScore + object.aiAdjustment), 0), 100)

                // Determine notification type
                let notifType: "APPRECIATION" | "IMPROVEMENT" | "ESCALATION" | null = null
                if (finalScore >= 90) notifType = "APPRECIATION"
                if (finalScore <= 60) notifType = "IMPROVEMENT"

                await prisma.$transaction(async (tx) => {
                    // 1. Save Score
                    const scoreRecord = await tx.weeklyScores.create({
                        data: {
                            evaluationHash,
                            employeeId: emp.id,
                            weekStartDate,
                            baseScore,
                            aiAdjustment: object.aiAdjustment,
                            finalScore,
                            confidenceScore: object.confidenceScore,
                            burnoutRisk: object.burnoutRisk,
                            behavioralAnomaly: object.behavioralAnomaly,
                            aiFeedback: object.aiFeedback,
                            organizationId: emp.organizationId
                        }
                    })

                    // 2. Queue Notification to Employee
                    if (notifType) {
                        await tx.notifications.create({
                            data: {
                                employeeId: emp.id,
                                type: notifType,
                                evaluationHash,
                                organizationId: emp.organizationId
                            }
                        })
                    }

                    // 3. Admin Escalation if anomalies detected
                    if (object.burnoutRisk || object.behavioralAnomaly) {
                        const reason = object.burnoutRisk
                            ? "AI detected Burnout Risk due to excessive hours."
                            : "AI detected a potential Behavioral Anomaly in productivity patterns."

                        await tx.adminAlerts.create({
                            data: {
                                employeeId: emp.id,
                                severity: "HIGH",
                                reason: `${reason} (Conf: ${(object.confidenceScore * 100).toFixed(0)}%) | Base Score: ${baseScore.toFixed(0)}`,
                                organizationId: emp.organizationId
                            }
                        })
                    }
                })

                processed++
            } catch (err) {
                console.error(`Error processing employee ${emp.id}:`, err)
                errors++
            }
        }

        // Log agent execution
        await prisma.agentExecutionLogs.create({
            data: {
                batchId,
                weekNumber,
                employeesProcessed: processed,
                errors,
                status: errors > 0 && processed === 0 ? "FAILED" : "COMPLETED",
                durationMs: Date.now() - now.getTime()
            }
        })

        return NextResponse.json({
            success: true,
            batchId,
            processed,
            errors,
            timeMs: Date.now() - now.getTime()
        })

    } catch (e: any) {
        console.error("Agent Critical Failure:", e)
        return NextResponse.json({ error: "Agent failure", details: e.message }, { status: 500 })
    }
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
}
