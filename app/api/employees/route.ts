import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action, Roles } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import bcrypt from "bcryptjs"
import crypto from "node:crypto"
import { employeeSchema } from "@/lib/schemas"
import { redis } from "@/lib/redis"
import { indexEmployee } from "@/lib/search-index"
import { sendEmail } from "@/lib/email"

// GET /api/employees – List all employees (paginated and scoped)
export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 100)
        const search = searchParams.get("search") || ""
        const skip = (page - 1) * limit

        const includeArchived = searchParams.get("includeArchived") === "true"

        const where = orgFilter(ctx, {
            ...(includeArchived ? {} : { deletedAt: null }),
            ...(search ? {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" as const } },
                    { lastName: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { employeeCode: { contains: search, mode: "insensitive" as const } },
                ],
            } : {}),
        })

        const [employees, total] = await prisma.$transaction([
            prisma.employee.findMany({
                where,
                include: {
                    department: true,
                    user: { select: { role: true, lastLoginAt: true, mustChangePassword: true } },
                    manager: { select: { id: true, firstName: true, lastName: true, designation: true, avatarUrl: true } },
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
export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.CREATE }, async (req, ctx) => {
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
            role,
            address,
            managerId,
            avatarUrl,
        } = parsed.data

        // Pre-check: ensure email and employeeCode don't already exist
        const [existingUser, existingEmployee, existingCode] = await Promise.all([
            prisma.user.findUnique({ where: { email }, select: { id: true } }),
            prisma.employee.findFirst({ where: { email, organizationId: ctx.organizationId }, select: { id: true } }),
            prisma.employee.findFirst({ where: { employeeCode, organizationId: ctx.organizationId }, select: { id: true } }),
        ])
        if (existingUser || existingEmployee) {
            return apiError("An account or employee with this email already exists.", ApiErrorCode.CONFLICT, 409)
        }
        if (existingCode) {
            return apiError("An employee with this code already exists.", ApiErrorCode.CONFLICT, 409)
        }

        // Validate manager exists in same org
        if (managerId) {
            const manager = await prisma.employee.findFirst({
                where: { id: managerId, organizationId: ctx.organizationId, status: "ACTIVE" },
                select: { id: true },
            })
            if (!manager) {
                return apiError("Manager not found in your organization", ApiErrorCode.NOT_FOUND, 404)
            }
        }

        // Generate cryptographically random temp password
        const tempPassword = crypto.randomUUID()
        const hashedPassword = await bcrypt.hash(tempPassword, 12)

        // Use a transaction to ensure both User and Employee are created or none
        const result = await prisma.$transaction(async (tx) => {
            // Create User account first
            const user = await tx.user.create({
                data: {
                    name: `${firstName} ${lastName}`,
                    email,
                    hashedPassword,
                    role: (role as any) || Roles.EMPLOYEE,
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

        console.log(`[NEW_EMPLOYEE] ${employeeCode} created in org ${ctx.organizationId}.`)

        // Fire-and-forget: index sync + welcome email
        indexEmployee(result.id).catch(() => {})
        sendEmail({
            to: email,
            subject: "Welcome to EMS Pro — Your Account is Ready",
            html: `<h2>Welcome, ${firstName}!</h2>
<p>Your employee account has been created. Here are your login credentials:</p>
<p><strong>Email:</strong> ${email}<br/><strong>Temporary Password:</strong> ${tempPassword}</p>
<p>You will be prompted to change your password on first login.</p>
<p>— EMS Pro Team</p>`,
        }).catch((err) => console.error("[WELCOME_EMAIL]", err))

        return apiSuccess({ ...result, tempPassword }, undefined, 201)
    } catch (error: unknown) {
        console.error("[EMPLOYEES_POST]", error)
        const prismaErr = error as { code?: string; meta?: { target?: string[] }; message?: string }
        if (prismaErr.code === 'P2002') {
            const target = (prismaErr.meta?.target || []).join(' ').toLowerCase()
            const errMsg = (prismaErr.message || '').toLowerCase()
            let message = "A conflict occurred. A record with these details already exists."
            if (target.includes('email') || errMsg.includes('email')) {
                message = "An account or employee with this email already exists."
            } else if (target.includes('employeecode') || target.includes('employee_code') || errMsg.includes('employeecode')) {
                message = "An employee with this code already exists."
            } else if (target.includes('userid') || target.includes('user_id')) {
                message = "This user account is already linked to another employee."
            }
            return apiError(message, ApiErrorCode.CONFLICT, 409)
        }
        if (prismaErr.code === 'P2003') {
            return apiError("Invalid department or manager selected.", ApiErrorCode.BAD_REQUEST, 400)
        }
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
