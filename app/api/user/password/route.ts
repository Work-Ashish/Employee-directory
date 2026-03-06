import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import bcrypt from "bcryptjs"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// PUT /api/user/password (Self/Admin, scoped)
export const PUT = withAuth({ module: Module.DASHBOARD, action: Action.VIEW }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { currentPassword, newPassword, isFirstLogin } = body

        if (!newPassword) {
            return apiError("New password required", ApiErrorCode.BAD_REQUEST, 400)
        }

        // Scope to user and organization for extra security
        const user = await prisma.user.findFirst({
            where: { id: ctx.userId, organizationId: ctx.organizationId }
        })
        if (!user || !user.hashedPassword) {
            return apiError("User not found or using social login", ApiErrorCode.NOT_FOUND, 404)
        }

        // First-login flow: no current password check required
        if (!isFirstLogin) {
            if (!currentPassword) {
                return apiError("Current password required", ApiErrorCode.BAD_REQUEST, 400)
            }
            const isPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword)
            if (!isPasswordValid) {
                return apiError("Invalid current password", ApiErrorCode.BAD_REQUEST, 400)
            }
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: ctx.userId },
            data: {
                hashedPassword: hashedNewPassword,
                mustChangePassword: false,
            },
        })

        return apiSuccess({ message: "Password updated successfully" })
    } catch (error) {
        console.error("[PASSWORD_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
