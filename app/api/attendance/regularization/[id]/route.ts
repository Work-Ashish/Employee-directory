import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action } from "@/lib/permissions"
import { z } from "zod"

const approveSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    notes: z.string().optional(),
})

// PATCH /api/attendance/regularization/:id – Approve or reject a regularization request
export const PATCH = withAuth({ module: Module.ATTENDANCE, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()
        const { status, notes } = approveSchema.parse(body)

        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.attendanceRegularization.findUnique({
                where: { id, organizationId: ctx.organizationId },
                include: { attendance: true }
            })

            if (!request) {
                throw new Error("NOT_FOUND")
            }

            if (request.status !== "PENDING") {
                throw new Error("ALREADY_PROCESSED")
            }

            // Update the request status
            const updatedRequest = await tx.attendanceRegularization.update({
                where: { id },
                data: { status, notes }
            })

            // If approved, update the actual attendance record
            if (status === "APPROVED") {
                const updateData: any = {}

                if (request.type === "MISSING_PUNCH" && request.requestedTime) {
                    // Logic depends on if we're fixing checkIn or checkOut
                    if (!request.attendance.checkIn) {
                        updateData.checkIn = request.requestedTime
                    } else if (!request.attendance.checkOut) {
                        updateData.checkOut = request.requestedTime
                    }
                } else if (request.type === "LATE_CORRECTION" && request.requestedTime) {
                    updateData.checkIn = request.requestedTime
                    updateData.isLate = false
                } else if (request.type === "EARLY_EXIT_CORRECTION" && request.requestedTime) {
                    updateData.checkOut = request.requestedTime
                    updateData.isEarlyExit = false
                }

                if (Object.keys(updateData).length > 0) {
                    await tx.attendance.update({
                        where: { id: request.attendanceId },
                        data: updateData
                    })
                }
            }

            return updatedRequest
        })

        return apiSuccess(result)
    } catch (error: any) {
        console.error("[REGULARIZATION_PATCH]", error)
        if (error.message === "NOT_FOUND") return apiError("Request not found", ApiErrorCode.NOT_FOUND, 404)
        if (error.message === "ALREADY_PROCESSED") return apiError("Request already processed", ApiErrorCode.BAD_REQUEST, 400)
        if (error.name === "ZodError") return apiError(error.errors[0].message, ApiErrorCode.BAD_REQUEST, 400)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
