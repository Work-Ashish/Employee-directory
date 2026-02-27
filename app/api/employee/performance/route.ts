import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
        }

        const employee = await getSessionEmployee()
        if (!employee) {
            return apiError("Employee record not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Fetch user's weekly scores, ordered by newest first
        const scores = await prisma.weeklyScores.findMany({
            where: { employeeId: employee.id },
            orderBy: { weekStartDate: "desc" },
            take: 12 // Last 12 weeks of history
        })

        // Fetch unread notifications
        const notifications = await prisma.notifications.findMany({
            where: {
                employeeId: employee.id,
                status: "PENDING"
            },
            orderBy: { sentAt: "desc" }
        })

        const formattedScores = scores.map(s => ({
            id: s.id,
            weekStartDate: s.weekStartDate.toISOString(),
            baseScore: Number(s.baseScore),
            aiAdjustment: Number(s.aiAdjustment),
            finalScore: Number(s.finalScore),
            aiFeedback: s.aiFeedback
        }))

        return apiSuccess({
            scores: formattedScores,
            notifications
        })

    } catch (error) {
        console.error("[EMPLOYEE_PERFORMANCE_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
}
