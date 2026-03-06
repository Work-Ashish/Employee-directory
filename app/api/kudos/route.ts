import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { z } from "zod"

const kudosSchema = z.object({
    toId: z.string().min(1, "Recipient is required"),
    message: z.string().min(2, "Message is too short").max(200, "Message is too long")
})

// GET /api/kudos - Get recent kudos for the organization
export const GET = withAuth({ module: Module.FEEDBACK, action: Action.VIEW }, async (req, ctx) => {
    try {
        const kudos = await prisma.kudos.findMany({
            where: { organizationId: ctx.organizationId },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                from: { select: { firstName: true, lastName: true, avatarUrl: true, department: { select: { name: true } } } },
                to: { select: { firstName: true, lastName: true } }
            }
        })

        const mappedKudos = kudos.map((k: any) => ({
            id: k.id,
            from: `${k.from.firstName} ${k.from.lastName.charAt(0)}.`,
            to: `${k.to.firstName} ${k.to.lastName}`,
            message: k.message,
            time: formatKudosTime(k.createdAt),
            color: getRandomKudosColor()
        }))

        return apiSuccess(mappedKudos)
    } catch (error) {
        console.error("[KUDOS_GET]", error)
        return apiError("Failed to fetch kudos", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/kudos - Send a kudos to a colleague
export const POST = withAuth({ module: Module.FEEDBACK, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const validated = kudosSchema.parse(body)

        // Get sender's employee ID
        const sender = await prisma.employee.findUnique({
            where: { userId: ctx.userId }
        })

        if (!sender) {
            return apiError("Sender profile not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const kudos = await prisma.kudos.create({
            data: {
                message: validated.message,
                fromId: sender.id,
                toId: validated.toId,
                organizationId: ctx.organizationId
            }
        })

        return apiSuccess(kudos)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return apiError(error.issues[0].message, ApiErrorCode.VALIDATION_ERROR, 400)
        }
        console.error("[KUDOS_POST]", error)
        return apiError("Failed to send kudos", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

function formatKudosTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffMin < 1) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${diffDay}d ago`
}

function getRandomKudosColor() {
    const colors = [
        "from-[#ef4444] to-[#f43f5e]",
        "from-[#3b82f6] to-[#06b6d4]",
        "from-[#10b981] to-[#34d399]",
        "from-[#f59e0b] to-[#fbbf24]",
        "from-[#8b5cf6] to-[#a78bfa]"
    ]
    return colors[Math.floor(Math.random() * colors.length)]
}
