import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import bcrypt from "bcryptjs"

// GET /api/employees/:id/credentials
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const employee = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id }),
        })
        if (!employee) return apiError("Employee not found", ApiErrorCode.NOT_FOUND, 404)
        if (!employee.userId) return apiError("No user account linked", ApiErrorCode.NOT_FOUND, 404)

        const user = await prisma.user.findUnique({
            where: { id: employee.userId },
            select: { mustChangePassword: true, lastLoginAt: true },
        })
        if (!user) return apiError("User account not found", ApiErrorCode.NOT_FOUND, 404)

        return apiSuccess({
            username: employee.employeeCode,
            hasPendingLogin: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt,
        })
    } catch (error) {
        console.error("[CREDENTIALS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/employees/:id/credentials – reset credentials
export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params

        const employee = await prisma.employee.findFirst({
            where: orgFilter(ctx, { id }),
        })
        if (!employee) return apiError("Employee not found", ApiErrorCode.NOT_FOUND, 404)
        if (!employee.userId) return apiError("No user account linked", ApiErrorCode.NOT_FOUND, 404)

        const year = new Date().getFullYear()
        const tempPassword = `${employee.employeeCode}@${year}`
        const hashedPassword = await bcrypt.hash(tempPassword, 12)

        await prisma.user.update({
            where: { id: employee.userId },
            data: { hashedPassword, mustChangePassword: true },
        })

        return apiSuccess({
            username: employee.employeeCode,
            tempPassword,
            message: "Credentials reset successfully",
        })
    } catch (error) {
        console.error("[CREDENTIALS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
