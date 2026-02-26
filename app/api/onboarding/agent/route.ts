// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const employee = await prisma.employee.findUnique({
            where: { email: session.user.email },
            include: {
                documents: true,
                trainings: {
                    include: {
                        training: true
                    }
                }
            }
        })

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is missing." }, { status: 500 })
        }

        const systemInstruction = `You are a friendly, encouraging Automated Onboarding Agent for EMS Pro. Your job is to welcome a new employee to their dashboard and guide them through their first few weeks. 
        
Analyze the provided JSON containing their profile, uploaded documents, and assigned training. 
Create a short, warm, personalized welcome message in Markdown.
Then, provide a checklist of what they have completed and what they still need to do. 
- Aadhar Card and PAN Card fall under KYC Documents. If "Aadhaar" or "PAN" aren't in their document titles, politely remind them to upload them.
- They must complete any trainings assigned to them where "completed" is false.
- Be extremely encouraging and use emojis. Output ONLY valid Markdown.`

        const employeeData = {
            name: `${employee.firstName} ${employee.lastName}`,
            department: employee.departmentId || "Unassigned",
            joinDate: employee.createdAt,
            uploadedDocs: employee.documents.map(d => d.title),
            assignedTrainings: employee.trainings.map(t => ({
                name: t.training.name,
                completed: t.completed,
                dueDate: t.training.dueDate
            }))
        }

        const prompt = `Here is the employee data:
\n\n${JSON.stringify(employeeData, null, 2)}\n\n
Please generate the onboarding welcome message and checklist.`

        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000) // 15s max

        try {
            const { text } = await generateText({
                model: google("gemini-2.0-flash"),
                system: systemInstruction,
                prompt,
                abortSignal: controller.signal,
            })

            return NextResponse.json({ message: text })
        } finally {
            clearTimeout(timeout)
        }

    } catch (error: any) {
        console.error("[ONBOARDING_AGENT_GET]", error)
        if (error?.name === "AbortError") {
            return NextResponse.json({ error: "Onboarding guide generation timed out." }, { status: 504 })
        }
        return NextResponse.json({ error: "Failed to fetch onboarding guide" }, { status: 500 })
    }
}
