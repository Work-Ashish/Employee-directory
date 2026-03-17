import { getServerSession } from "@/lib/auth-server"

/**
 * Get the authenticated employee's ID from the session.
 * The Django session already includes employeeId from the /auth/me/ endpoint.
 */
export async function getSessionEmployee(): Promise<{ employeeId: string | undefined }> {
    const session = await getServerSession()
    return { employeeId: session?.user?.employeeId }
}
