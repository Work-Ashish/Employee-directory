import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { trainingSchema } from "@/lib/schemas"

// GET /api/training – List all trainings (scoped)
export const GET = withAuth(["ADMIN", "EMPLOYEE"], async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const employeeId = searchParams.get("employeeId")

        const trainings = await prisma.training.findMany({
            where: {
                organizationId: ctx.organizationId,
                ...(employeeId ? {
                    enrollments: {
                        some: { employeeId }
                    }
                } : {})
            },
            include: {
                enrollments: {
                    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        })

        return apiSuccess(trainings)
    } catch (error) {
        console.error("[TRAINING_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/training – Create a training
export const POST = withAuth("ADMIN", async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = trainingSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const { assignedEmployeeIds, assignToAll } = body

        const training = await prisma.training.create({
            data: {
                name: parsed.data.name,
                type: parsed.data.type,
                description: parsed.data.description,
                status: "UPCOMING",
                progress: 0,
                dueDate: parsed.data.dueDate,
                participants: 0,
                videoUrl: parsed.data.videoUrl,
                organizationId: ctx.organizationId,
            },
        })

        // Handle Assignments
        let targetEmployeeIds: string[] = []
        if (assignToAll) {
            const allEmployees = await prisma.employee.findMany({
                where: { status: "ACTIVE", organizationId: ctx.organizationId },
                select: { id: true }
            })
            targetEmployeeIds = allEmployees.map(e => e.id)
        } else if (assignedEmployeeIds && Array.isArray(assignedEmployeeIds)) {
            targetEmployeeIds = assignedEmployeeIds
        }

        if (targetEmployeeIds.length > 0) {
            await prisma.trainingEnrollment.createMany({
                data: targetEmployeeIds.map(empId => ({
                    trainingId: training.id,
                    employeeId: empId,
                    organizationId: ctx.organizationId,
                    completed: false,
                })),
                skipDuplicates: true
            })

            // Update participant count
            await prisma.training.update({
                where: { id: training.id },
                data: { participants: targetEmployeeIds.length }
            })
        }

        return apiSuccess(training, undefined, 201)
    } catch (error: any) {
        console.error("[TRAINING_POST] Error:", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/training – Update a training
export const PUT = withAuth("ADMIN", async (req, ctx) => {
    try {
        const body = await req.json()
        const { id, assignedEmployeeIds, assignToAll, ...data } = body

        if (!id) {
            return apiError("ID required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const training = await prisma.training.update({
            where: { id, organizationId: ctx.organizationId },
            data: {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                progress: data.progress !== undefined ? parseInt(data.progress) : undefined,
                participants: data.participants !== undefined ? parseInt(data.participants) : undefined,
            },
        })

        // Handle Assignments (Additive)
        let targetEmployeeIds: string[] = []
        if (assignToAll) {
            const allEmployees = await prisma.employee.findMany({
                where: { status: "ACTIVE", organizationId: ctx.organizationId },
                select: { id: true }
            })
            targetEmployeeIds = allEmployees.map(e => e.id)
        } else if (assignedEmployeeIds && Array.isArray(assignedEmployeeIds)) {
            targetEmployeeIds = assignedEmployeeIds
        }

        if (targetEmployeeIds.length > 0) {
            await prisma.trainingEnrollment.createMany({
                data: targetEmployeeIds.map(empId => ({
                    trainingId: id,
                    employeeId: empId,
                    organizationId: ctx.organizationId,
                    completed: false,
                })),
                skipDuplicates: true
            })

            // Recalculate participant count
            const count = await prisma.trainingEnrollment.count({
                where: { trainingId: id }
            })
            await prisma.training.update({
                where: { id },
                data: { participants: count }
            })
        }

        return apiSuccess(training)
    } catch (error) {
        console.error("[TRAINING_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/training – Delete a training
export const DELETE = withAuth("ADMIN", async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return apiError("ID required", ApiErrorCode.BAD_REQUEST, 400)
        }

        // Verify ownership/scoping
        const existing = await prisma.training.findFirst({
            where: { id, organizationId: ctx.organizationId }
        })
        if (!existing) return apiError("Training not found", ApiErrorCode.NOT_FOUND, 404)

        // Delete enrollments first (Cascade-like manually)
        await prisma.trainingEnrollment.deleteMany({
            where: { trainingId: id }
        })

        await prisma.training.delete({
            where: { id },
        })

        return apiSuccess({ message: "Training deleted" })
    } catch (error) {
        console.error("[TRAINING_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
