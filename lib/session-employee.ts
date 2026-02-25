import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * Get the authenticated employee's ID from the session.
 * Tries userId match first, then falls back to email match.
 */
export async function getSessionEmployee() {
    const session = await auth()
    if (!session?.user?.id) return null

    let employee = await prisma.employee.findFirst({
        where: { userId: session.user.id },
        select: { id: true }
    })

    if (!employee && session.user.email) {
        employee = await prisma.employee.findFirst({
            where: { email: session.user.email },
            select: { id: true }
        })
    }

    return employee
}
