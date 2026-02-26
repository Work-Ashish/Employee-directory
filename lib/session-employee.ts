import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * Get the authenticated employee's ID from the session.
 * Uses a single OR query for efficiency (userId or email match).
 */
export async function getSessionEmployee() {
    const session = await auth()
    if (!session?.user?.id) return null

    const employee = await prisma.employee.findFirst({
        where: {
            OR: [
                { userId: session.user.id },
                ...(session.user.email ? [{ email: session.user.email }] : []),
            ],
        },
        select: { id: true, organizationId: true },
    })

    return employee
}

