import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import bcrypt from "bcryptjs"
import { employeeSchema } from "@/lib/schemas"
import { redis } from "@/lib/redis"

// GET /api/employees – List all employees (paginated and scoped)
export const GET = withAuth(["ADMIN", "EMPLOYEE"], async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 100)
        const search = searchParams.get("search") || ""
        const skip = (page - 1) * limit

        const where = orgFilter(ctx, search
            ? {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" as const } },
                    { lastName: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { employeeCode: { contains: search, mode: "insensitive" as const } },
                ],
            }
            : {})

        const [employees, total] = await prisma.$transaction([
            prisma.employee.findMany({
                where,
                include: {
                    department: true,
                    user: { select: { lastLoginAt: true, mustChangePassword: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.employee.count({ where }),
        ])

        return apiSuccess(employees, { total, page, limit })
    } catch (error) {
        console.error("[EMPLOYEES_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/employees – Create a new employee + auto-create login credentials
export const POST = withAuth("ADMIN", async (req, ctx) => {
    try {
        const body = await req.json()

        // Zod Validation
        const parsed = employeeSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const {
            employeeCode,
            firstName,
            lastName,
            email,
            phone,
            designation,
            departmentId,
            dateOfJoining,
            salary,
            status,
            address,
            managerId,
            avatarUrl,
        } = parsed.data

        // Generate temp password: EmployeeCode@Year
        const year = new Date().getFullYear()
        const tempPassword = `${employeeCode}@${year}`
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        // Use a transaction to ensure both User and Employee are created or none
        const result = await prisma.$transaction(async (tx) => {
            // Create User account first
            const user = await tx.user.create({
                data: {
                    name: `${firstName} ${lastName}`,
                    email,
                    hashedPassword,
                    role: "EMPLOYEE",
                    organizationId: ctx.organizationId,
                    mustChangePassword: true,
                    avatar: avatarUrl || null,
                },
            })

            // Create Employee and link to User
            const employee = await tx.employee.create({
                data: {
                    employeeCode,
                    firstName,
                    lastName,
                    email,
                    phone,
                    designation,
                    departmentId,
                    organizationId: ctx.organizationId,
                    dateOfJoining: parsed.data.dateOfJoining || new Date(dateOfJoining),
                    salary: salary,
                    status: status || "ACTIVE",
                    address,
                    managerId: managerId || null,
                    userId: user.id,
                    avatarUrl: avatarUrl || null,
                },
                include: { department: true },
            })

            return employee
        })

        // Clear dashboard cache
        try {
            await redis.set("admin:dashboard:metrics", "", { ex: 1 })
        } catch (e) {
            console.error("Failed to invalidate dashboard cache", e)
        }

        console.log(`[NEW_EMPLOYEE] ${employeeCode} created in org ${ctx.organizationId}.`)

        return apiSuccess(result, undefined, 201)
    } catch (error: any) {
        console.error("[EMPLOYEES_POST] FULL ERROR:", error)
        if (error.code === 'P2002') {
            const target = error.meta?.target || []
            let message = "A conflict occurred."
            if (target.includes('email')) {
                message = "An account or employee with this email already exists."
            } else if (target.includes('employeeCode')) {
                message = "An employee with this code already exists."
            }
            return apiError(message, ApiErrorCode.CONFLICT, 409)
        }
        if (error.code === 'P2003') {
            return apiError("Invalid department or manager selected.", ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
