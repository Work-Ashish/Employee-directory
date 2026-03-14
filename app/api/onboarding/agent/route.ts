import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

// GET /api/onboarding/agent – Personalized onboarding guide
export const GET = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (req, ctx) => {
    try {
        const employee = await prisma.employee.findFirst({
            where: { userId: ctx.userId, organizationId: ctx.organizationId },
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
            return apiError("Employee profile not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return apiError("GEMINI_API_KEY is missing", ApiErrorCode.INTERNAL_ERROR, 500)
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
            departmentId: employee.departmentId || "Unassigned",
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

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        try {
            const { text } = await generateText({
                model: google("gemini-2.5-flash"),
                system: systemInstruction,
                prompt,
                abortSignal: controller.signal,
            })

            return apiSuccess({ message: text })
        } finally {
            clearTimeout(timeout)
        }

    } catch (error: any) {
        console.error("[ONBOARDING_AGENT_GET]", error)
        if (error?.name === "AbortError") {
            return apiError("Onboarding guide generation timed out", ApiErrorCode.INTERNAL_ERROR, 504)
        }
        return apiError("Failed to fetch onboarding guide", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
