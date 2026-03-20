import { NextResponse } from "next/server"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

const SYSTEM_PROMPT = `You are EMS Pro Assistant — a helpful, concise HR management AI embedded in an Employee Management System.

You help users with:
- HR policies, leave balance, attendance, payroll questions
- How to use EMS Pro features (employees, departments, teams, training, documents, etc.)
- General workplace guidance and best practices
- Generating quick summaries or explanations

Rules:
- Be friendly but professional
- Keep answers concise (2-4 sentences unless detail is requested)
- If you don't know something specific to their organization, say so and suggest where to find it
- Never fabricate employee data or numbers
- For sensitive actions (deleting records, payroll changes), remind users to use the proper admin UI`

interface ChatMessage {
    role: string
    content: string
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const messages: ChatMessage[] = body.messages || []

        if (!messages.length) {
            return NextResponse.json({ reply: "Please send a message." }, { status: 400 })
        }

        const { text } = await generateText({
            model: google("gemini-2.5-flash"),
            system: SYSTEM_PROMPT,
            messages: messages.map((m) => ({
                role: m.role === "user" ? "user" as const : "assistant" as const,
                content: m.content,
            })),
        })

        return NextResponse.json({ reply: text })
    } catch (error) {
        console.error("[CHAT_API_ERROR]", error)
        const message = error instanceof Error ? error.message : "Unknown error"

        if (message.includes("API key") || message.includes("authentication")) {
            return NextResponse.json(
                { reply: "AI service not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in your .env file." },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { reply: "Sorry, I encountered an error. Please try again." },
            { status: 500 }
        )
    }
}
