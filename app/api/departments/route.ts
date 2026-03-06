import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { departmentSchema } from "@/lib/schemas"

// GET /api/departments – List all departments (scoped)
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const departments = await prisma.department.findMany({
            where: { organizationId: ctx.organizationId },
            include: {
                _count: { select: { employees: true } },
            },
            orderBy: { name: "asc" },
        })

        return apiSuccess(departments)
    } catch (error) {
        console.error("[DEPARTMENTS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/departments – Create a department
export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = departmentSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const department = await prisma.department.create({
            data: {
                name: parsed.data.name,
                color: parsed.data.color,
                organizationId: ctx.organizationId,
            },
        })

        return apiSuccess(department, undefined, 201)
    } catch (error: any) {
        console.error("[DEPARTMENTS_POST]", error)

        // Handle unique constraint violation (Prisma P2002)
        if (error.code === 'P2002') {
            return apiError("A department with this name already exists.", ApiErrorCode.CONFLICT, 409)
        }

        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
