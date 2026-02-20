import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

interface ChatMessage {
    role: "user" | "model"
    parts: { text: string }[]
}

// POST /api/chat – Send message to Gemini AI
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { messages } = await req.json()

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { reply: "AI chatbot is not configured. Please add GEMINI_API_KEY to your .env file." },
                { status: 200 }
            )
        }

        const userName = session.user?.name || "User"
        const userRole = session.user?.role || "EMPLOYEE"

        const systemInstruction = `You are **EMS Pro Assistant**, the built-in AI helper for an Employee Management System.

Your personality:
- Friendly, professional, and concise
- You use emoji sparingly to keep things warm 👋
- Keep responses short (2-4 sentences) unless the user asks for detail

You know about these EMS Pro modules:
- Employee Directory, Attendance, Leave Management, Payroll, PF (Provident Fund)
- Performance Reviews, Training, Recruitment, Assets, Documents
- Announcements, Help Desk (Tickets), Calendar, Resignation, Organization Chart, Settings

You can help with:
- Navigating the app ("Where can I apply for leave?" → /leave page)
- Explaining HR policies and processes
- Answering general HR questions (leave types, PF calculations, payroll breakdowns)
- Guiding admins on how to manage employees, process payroll, or handle tickets
- Providing tips on using features

Current user info:
- Name: ${userName}
- Role: ${userRole}

If the user asks something outside HR/EMS scope, politely redirect them. Never make up specific employee data.`

        // Build Gemini API request
        const geminiMessages: ChatMessage[] = messages.map(
            (msg: { role: string; content: string }) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }],
            })
        )

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }],
                    },
                    contents: geminiMessages,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        maxOutputTokens: 512,
                    },
                }),
            }
        )

        if (!response.ok) {
            const errorData = await response.text()
            console.error("[CHAT_GEMINI_ERROR]", errorData)
            return NextResponse.json(
                { reply: "Sorry, I'm having trouble connecting to my AI brain right now. Please try again in a moment." },
                { status: 200 }
            )
        }

        const data = await response.json()
        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "I couldn't generate a response. Please try again."

        return NextResponse.json({ reply })
    } catch (error) {
        console.error("[CHAT_POST]", error)
        return NextResponse.json(
            { reply: "Something went wrong. Please try again." },
            { status: 200 }
        )
    }
}
