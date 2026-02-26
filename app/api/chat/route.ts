// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { google } from "@ai-sdk/google"
import { generateText, tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"
import crypto from "crypto"

export async function POST(req: Request) {
    try {
        const session = await auth()
        const employee = await getSessionEmployee()
        const { messages } = await req.json()

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { reply: "AI chatbot is not configured. Please add GEMINI_API_KEY to your .env file." },
                { status: 200 }
            )
        }

        const userName = session?.user?.name || "User"
        const userRole = session?.user?.role || "EMPLOYEE"

        const systemInstruction = `You are **EMS Pro Assistant**, the built-in AI helper for an Employee Management System.

Your personality:
- Friendly, professional, and concise. Use emoji sparingly 👋
- Keep responses short (2-4 sentences) unless the user asks for detail.
- If you use tools to fetch or act on data, summarize exactly what happened.

Current user info:
- Name: ${userName}
- Role: ${userRole}
- Employee ID: ${employee?.id || "N/A"}

If the user asks something outside HR/EMS scope, politely redirect them. Never make up specific employee data. Always use the provided tools to serve real data.`

        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000) // 20s max

        try {
            const { text } = await generateText({
                model: google("gemini-2.0-flash"),
                system: systemInstruction,
                messages,
                maxSteps: 5,
                tools: {
                    checkLeaveBalance: tool({
                        description: "Check exactly how many approved, pending, and rejected leaves the user has.",
                        parameters: z.object({}),
                        execute: async () => {
                            if (!employee) return "User is not logged in as an employee."
                            const leaves = await prisma.leave.findMany({ where: { employeeId: employee.id } })
                            const approved = leaves.filter(l => l.status === "APPROVED").length
                            const pending = leaves.filter(l => l.status === "PENDING").length
                            const rejected = leaves.filter(l => l.status === "REJECTED").length
                            return `The user has ${approved} approved leaves, ${pending} pending leaves, and ${rejected} rejected leaves on record.`
                        }
                    }),
                    submitLeaveRequest: tool({
                        description: "Autonomously submit a new leave request for the user.",
                        parameters: z.object({
                            type: z.enum(["CASUAL", "SICK", "EARNED", "MATERNITY", "PATERNITY", "UNPAID"]).describe("The type of leave."),
                            startDate: z.string().describe("ISO date string for the start date"),
                            endDate: z.string().describe("ISO date string for the end date"),
                            reason: z.string().describe("The reason for taking leave")
                        }),
                        execute: async ({ type, startDate, endDate, reason }: any) => {
                            if (!employee) return "User is not logged in as an employee."
                            try {
                                const leave = await prisma.leave.create({
                                    data: {
                                        employeeId: employee.id,
                                        type,
                                        startDate: new Date(startDate),
                                        endDate: new Date(endDate),
                                        reason,
                                        status: "PENDING"
                                    }
                                })
                                return `Successfully submitted a ${type} leave request from ${startDate} to ${endDate}. The request is PENDING approval.`
                            } catch (e: any) {
                                return `Failed to submit leave request: ${e.message}`
                            }
                        }
                    }),
                    createSupportTicket: tool({
                        description: "Create an IT or HR support ticket on behalf of the user.",
                        parameters: z.object({
                            subject: z.string().describe("Short subject of the issue"),
                            description: z.string().describe("Detailed description"),
                            category: z.enum(["IT", "HR", "FINANCE", "FACILITIES", "OTHER"]).describe("The category to route the ticket to"),
                            priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).describe("Priority of the issue")
                        }),
                        execute: async ({ subject, description, category, priority }: any) => {
                            if (!employee) return "User is not logged in as an employee."
                            try {
                                // Generate collision-resistant ticket code using UUID
                                const shortId = crypto.randomUUID().slice(0, 8).toUpperCase()
                                const ticketCode = `TKT-${new Date().getFullYear()}-${shortId}`

                                const ticket = await prisma.ticket.create({
                                    data: {
                                        ticketCode,
                                        employeeId: employee.id,
                                        subject,
                                        description,
                                        category,
                                        priority,
                                        status: "OPEN"
                                    }
                                })
                                return `Ticket created successfully! Ticket ID is ${ticket.ticketCode}. It has been marked as OPEN.`
                            } catch (e: any) {
                                return `Failed to create ticket: ${e.message}`
                            }
                        }
                    })
                },
                abortSignal: controller.signal,
            } as any)

            return NextResponse.json({ reply: text })
        } finally {
            clearTimeout(timeout)
        }
    } catch (error) {
        console.error("[CHAT_POST]", error)
        return NextResponse.json(
            { reply: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
