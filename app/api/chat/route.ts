import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { google } from "@ai-sdk/google"
import { generateText, tool, embed } from "ai"
import { z } from "zod"
import crypto from "crypto"
import { redis } from "@/lib/redis"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export const POST = withAuth(["ADMIN", "EMPLOYEE"], async (req, ctx) => {
    try {
        const { messages } = await req.json()

        // AI Circuit Breaker
        const breakerKey = "gemini:circuit_open"
        const circuitOpen = await redis.get(breakerKey)
        if (circuitOpen) {
            console.warn("🚨 AI Circuit Breaker is OPEN. Rejecting request.")
            return apiError("AI assistant temporarily unavailable", ApiErrorCode.RATE_LIMITED, 503)
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return apiSuccess({ reply: "AI chatbot is not configured. Please add GEMINI_API_KEY to your .env file." })
        }

        const userName = ctx.name || "User"
        const userRole = ctx.role || "EMPLOYEE"

        let systemInstruction = `You are **EMS Pro Assistant**, the built-in AI helper for an Employee Management System.
        
Your personality:
- Friendly, professional, and concise. Use emoji sparingly 👋
- Keep responses short (2-4 sentences) unless the user asks for detail.
- If you use tools to fetch or act on data, summarize exactly what happened.

Current user info:
- Name: ${userName}
- Role: ${userRole}
- Organization ID: ${ctx.organizationId}

If the user asks something outside HR/EMS scope, politely redirect them. Never make up specific employee data. Always use the provided tools to serve real data.`

        // RAG VECTOR SEARCH (Organization-Scoped)
        try {
            const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()
            if (lastUserMessage && lastUserMessage.content) {
                const { embedding } = await embed({
                    model: google.textEmbeddingModel('text-embedding-004'),
                    value: lastUserMessage.content,
                })

                const vectorString = `[${embedding.join(',')}]`

                // Scoped by organizationId to prevent cross-tenant data leaks in RAG
                const relevantDocs = await prisma.$queryRawUnsafe<Array<{ content: string }>>(`
                    SELECT content
                    FROM "DocumentEmbedding"
                    WHERE "organizationId" = $1
                    ORDER BY embedding <=> $2::vector
                    LIMIT 3;
                `, ctx.organizationId, vectorString)

                if (relevantDocs && relevantDocs.length > 0) {
                    systemInstruction += `\n\n### Official Company Policies / Handbooks Context:\n`
                    relevantDocs.forEach((doc, i) => {
                        systemInstruction += `--- Document ${i + 1} ---\n${doc.content}\n\n`
                    })
                    systemInstruction += `Use the above organizational documents to answer policy questions definitively.`
                }
            }
        } catch (e) {
            console.error("Vector search failed, proceeding without RAG context:", e)
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)

        try {
            const { text } = await generateText({
                model: google("gemini-1.5-pro"),
                system: systemInstruction,
                messages,
                tools: {
                    checkLeaveBalance: {
                        description: "Check how many approved, pending, and rejected leaves the user has.",
                        inputSchema: z.object({}),
                        execute: async () => {
                            const employee = await prisma.employee.findFirst({
                                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                                select: { id: true }
                            })
                            if (!employee) return "No employee profile found."

                            const leaves = await prisma.leave.findMany({
                                where: { employeeId: employee.id, organizationId: ctx.organizationId }
                            })
                            const approved = leaves.filter(l => l.status === "APPROVED").length
                            const pending = leaves.filter(l => l.status === "PENDING").length
                            const rejected = leaves.filter(l => l.status === "REJECTED").length
                            return `You have ${approved} approved, ${pending} pending, and ${rejected} rejected leaves.`
                        }
                    },
                    submitLeaveRequest: {
                        description: "Submit a new leave request.",
                        inputSchema: z.object({
                            type: z.enum(["CASUAL", "SICK", "EARNED", "MATERNITY", "PATERNITY", "UNPAID"]),
                            startDate: z.string(),
                            endDate: z.string(),
                            reason: z.string()
                        }),
                        execute: async ({ type, startDate, endDate, reason }: any) => {
                            const employee = await prisma.employee.findFirst({
                                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                                select: { id: true }
                            })
                            if (!employee) return "No employee profile found."

                            try {
                                await prisma.leave.create({
                                    data: {
                                        employeeId: employee.id,
                                        organizationId: ctx.organizationId,
                                        type,
                                        startDate: new Date(startDate),
                                        endDate: new Date(endDate),
                                        reason,
                                        status: "PENDING"
                                    }
                                })
                                return `Successfully submitted a ${type} leave request from ${startDate} to ${endDate}.`
                            } catch (e: any) {
                                return `Failed to submit leave request: ${e.message}`
                            }
                        }
                    },
                    createSupportTicket: {
                        description: "Create an IT or HR support ticket.",
                        inputSchema: z.object({
                            subject: z.string(),
                            description: z.string(),
                            category: z.enum(["IT", "HR", "FINANCE", "FACILITIES", "OTHER"]),
                            priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
                        }),
                        execute: async ({ subject, description, category, priority }: any) => {
                            const employee = await prisma.employee.findFirst({
                                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                                select: { id: true }
                            })
                            if (!employee) return "No employee profile found."

                            try {
                                const shortId = crypto.randomUUID().slice(0, 8).toUpperCase()
                                const ticketCode = `TKT-${new Date().getFullYear()}-${shortId}`

                                const ticket = await prisma.ticket.create({
                                    data: {
                                        ticketCode,
                                        employeeId: employee.id,
                                        organizationId: ctx.organizationId,
                                        subject,
                                        description,
                                        category,
                                        priority,
                                        status: "OPEN"
                                    }
                                })
                                return `Ticket created successfully! ID: ${ticket.ticketCode}.`
                            } catch (e: any) {
                                return `Failed to create ticket: ${e.message}`
                            }
                        }
                    }
                },
                abortSignal: controller.signal,
            })

            return apiSuccess({ reply: text })
        } finally {
            clearTimeout(timeout)
        }
    } catch (error) {
        console.error("[CHAT_POST]", error)
        try {
            const failKey = "gemini:failures"
            const fails = await redis.incr(failKey)
            if (fails === 1) await redis.expire(failKey, 60)
            if (fails >= 5) await redis.set("gemini:circuit_open", "true", { ex: 60 })
        } catch (e) { }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
