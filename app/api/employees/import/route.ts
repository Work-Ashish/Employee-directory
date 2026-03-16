import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action, Roles } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import bcrypt from "bcryptjs"
import crypto from "node:crypto"
import { indexEmployee } from "@/lib/search-index"

const MAX_ROWS = 500
const VALID_ROLES = ["CEO", "HR", "PAYROLL", "TEAM_LEAD", "EMPLOYEE"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RowError = { row: number; employeeCode?: string; email?: string; reason: string }
type Credential = { employeeCode: string; email: string; tempPassword: string; name: string }
type ProcessedRow = {
    rowIndex: number
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    designation: string
    departmentId: string
    role: string
    managerId: string | null
    dateOfJoining: Date
    salary: number
}

// POST /api/employees/import — Bulk import employees from mapped spreadsheet rows
export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.IMPORT }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { rows, mode = "skip-errors", hierarchyAudit } = body

        if (!Array.isArray(rows) || rows.length === 0) {
            return apiError("No rows provided", ApiErrorCode.BAD_REQUEST, 400)
        }
        if (rows.length > MAX_ROWS) {
            return apiError(`Maximum ${MAX_ROWS} rows per upload. Received ${rows.length}.`, ApiErrorCode.BAD_REQUEST, 400)
        }
        if (!["all-or-nothing", "skip-errors"].includes(mode)) {
            return apiError("Invalid mode. Use 'all-or-nothing' or 'skip-errors'.", ApiErrorCode.BAD_REQUEST, 400)
        }

        const orgId = ctx.organizationId

        // Pre-fetch lookup data in parallel
        const [departments, existingEmployees] = await Promise.all([
            prisma.department.findMany({
                where: { organizationId: orgId },
                select: { id: true, name: true },
            }),
            prisma.employee.findMany({
                where: { organizationId: orgId, deletedAt: null },
                select: { id: true, email: true, employeeCode: true },
            }),
        ])

        const deptMap = new Map(departments.map(d => [d.name.toLowerCase(), d.id]))
        const managerByEmail = new Map(existingEmployees.map(e => [e.email.toLowerCase(), e.id]))
        const managerByCode = new Map(existingEmployees.map(e => [e.employeeCode.toLowerCase(), e.id]))

        // Per-row validation
        const rowErrors: RowError[] = []
        const validRows: ProcessedRow[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowNum = i + 1

            // Name resolution
            let firstName = String(row.firstName || "").trim()
            let lastName = String(row.lastName || "").trim()
            if (!firstName && row.fullName) {
                const parts = String(row.fullName).trim().split(/\s+/)
                firstName = parts[0] ?? ""
                lastName = parts.slice(1).join(" ") || firstName
            }

            const email = String(row.email || "").trim().toLowerCase()
            const designation = String(row.designation || "").trim()
            const deptName = String(row.departmentName || "").trim().toLowerCase()
            const managerRef = String(row.managerEmail || "").trim().toLowerCase()

            // Required field checks
            if (!email || !EMAIL_RE.test(email)) {
                rowErrors.push({ row: rowNum, reason: "Invalid or missing email" })
                if (mode === "all-or-nothing") {
                    return apiError(`Row ${rowNum}: Invalid or missing email`, ApiErrorCode.VALIDATION_ERROR, 422)
                }
                continue
            }
            if (!firstName) {
                rowErrors.push({ row: rowNum, email, reason: "Missing first name" })
                if (mode === "all-or-nothing") {
                    return apiError(`Row ${rowNum}: Missing first name`, ApiErrorCode.VALIDATION_ERROR, 422)
                }
                continue
            }
            if (!designation) {
                rowErrors.push({ row: rowNum, email, reason: "Missing designation" })
                if (mode === "all-or-nothing") {
                    return apiError(`Row ${rowNum}: Missing designation`, ApiErrorCode.VALIDATION_ERROR, 422)
                }
                continue
            }

            // Department resolution
            const departmentId = deptMap.get(deptName)
            if (!departmentId) {
                rowErrors.push({ row: rowNum, email, reason: `Department "${row.departmentName || ""}" not found` })
                if (mode === "all-or-nothing") {
                    return apiError(`Row ${rowNum}: Department "${row.departmentName || ""}" not found`, ApiErrorCode.VALIDATION_ERROR, 422)
                }
                continue
            }

            // Role normalization
            const roleRaw = String(row.role || "EMPLOYEE").toUpperCase().replace(/\s+/g, "_")
            const role = VALID_ROLES.includes(roleRaw) ? roleRaw : "EMPLOYEE"

            // Manager resolution
            let managerId: string | null = null
            if (role !== "CEO") {
                if (managerRef) {
                    managerId = managerByEmail.get(managerRef) || managerByCode.get(managerRef) || null
                }
                if (!managerId) {
                    rowErrors.push({ row: rowNum, email, reason: managerRef ? `Manager "${row.managerEmail}" not found` : "Manager required for non-CEO employees" })
                    if (mode === "all-or-nothing") {
                        return apiError(`Row ${rowNum}: Manager not resolved`, ApiErrorCode.VALIDATION_ERROR, 422)
                    }
                    continue
                }
            }

            // Employee code
            const employeeCode = String(row.employeeCode || "").trim()
                || `EMP-${orgId.slice(-4)}-${Date.now().toString(36).toUpperCase()}-${i}`

            // Date parsing
            let dateOfJoining: Date
            try {
                dateOfJoining = row.dateOfJoining ? new Date(row.dateOfJoining) : new Date()
                if (isNaN(dateOfJoining.getTime())) dateOfJoining = new Date()
            } catch {
                dateOfJoining = new Date()
            }

            const salary = parseFloat(String(row.salary || 0)) || 0

            validRows.push({
                rowIndex: i, employeeCode, firstName, lastName: lastName || firstName,
                email, designation, departmentId, role, managerId, dateOfJoining, salary,
            })
        }

        // Batch uniqueness pre-check
        const [existingByEmail, existingByCode] = await Promise.all([
            prisma.user.findMany({
                where: { email: { in: validRows.map(r => r.email) } },
                select: { email: true },
            }),
            prisma.employee.findMany({
                where: { employeeCode: { in: validRows.map(r => r.employeeCode) } },
                select: { employeeCode: true },
            }),
        ])
        const takenEmails = new Set(existingByEmail.map(u => u.email.toLowerCase()))
        const takenCodes = new Set(existingByCode.map(e => e.employeeCode.toLowerCase()))

        let inserted = 0
        let skipped = 0
        const credentials: Credential[] = []

        if (mode === "all-or-nothing") {
            // Pre-validate uniqueness for all rows
            for (const row of validRows) {
                if (takenEmails.has(row.email)) {
                    return apiError(`Row ${row.rowIndex + 1}: Email "${row.email}" already exists`, ApiErrorCode.CONFLICT, 409)
                }
                if (takenCodes.has(row.employeeCode.toLowerCase())) {
                    return apiError(`Row ${row.rowIndex + 1}: Employee code "${row.employeeCode}" already exists`, ApiErrorCode.CONFLICT, 409)
                }
            }

            // Hash all passwords in parallel (outside transaction for performance)
            const prepared = await Promise.all(validRows.map(async (row) => {
                const tempPassword = crypto.randomUUID()
                const hashedPassword = await bcrypt.hash(tempPassword, 12)
                return { row, tempPassword, hashedPassword }
            }))

            // Single atomic transaction
            await prisma.$transaction(async (tx) => {
                for (const { row, hashedPassword } of prepared) {
                    const user = await tx.user.create({
                        data: {
                            name: `${row.firstName} ${row.lastName}`,
                            email: row.email,
                            hashedPassword,
                            role: row.role as any,
                            organizationId: orgId,
                            mustChangePassword: true,
                        },
                    })
                    await tx.employee.create({
                        data: {
                            employeeCode: row.employeeCode,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            email: row.email,
                            designation: row.designation,
                            departmentId: row.departmentId,
                            organizationId: orgId,
                            dateOfJoining: row.dateOfJoining,
                            salary: row.salary,
                            status: "ACTIVE",
                            managerId: row.managerId,
                            userId: user.id,
                        },
                    })
                }
            })

            inserted = prepared.length
            for (const { row, tempPassword } of prepared) {
                credentials.push({
                    employeeCode: row.employeeCode,
                    email: row.email,
                    tempPassword,
                    name: `${row.firstName} ${row.lastName}`,
                })
            }
        } else {
            // Skip-errors mode: per-row transactions
            for (const row of validRows) {
                if (takenEmails.has(row.email)) {
                    rowErrors.push({ row: row.rowIndex + 1, email: row.email, reason: "Email already exists" })
                    skipped++
                    continue
                }
                if (takenCodes.has(row.employeeCode.toLowerCase())) {
                    rowErrors.push({ row: row.rowIndex + 1, employeeCode: row.employeeCode, reason: "Employee code already exists" })
                    skipped++
                    continue
                }

                try {
                    const tempPassword = crypto.randomUUID()
                    const hashedPassword = await bcrypt.hash(tempPassword, 12)

                    await prisma.$transaction(async (tx) => {
                        const user = await tx.user.create({
                            data: {
                                name: `${row.firstName} ${row.lastName}`,
                                email: row.email,
                                hashedPassword,
                                role: row.role as any,
                                organizationId: orgId,
                                mustChangePassword: true,
                            },
                        })
                        await tx.employee.create({
                            data: {
                                employeeCode: row.employeeCode,
                                firstName: row.firstName,
                                lastName: row.lastName,
                                email: row.email,
                                designation: row.designation,
                                departmentId: row.departmentId,
                                organizationId: orgId,
                                dateOfJoining: row.dateOfJoining,
                                salary: row.salary,
                                status: "ACTIVE",
                                managerId: row.managerId,
                                userId: user.id,
                            },
                        })
                    })

                    credentials.push({
                        employeeCode: row.employeeCode,
                        email: row.email,
                        tempPassword,
                        name: `${row.firstName} ${row.lastName}`,
                    })
                    takenEmails.add(row.email)
                    takenCodes.add(row.employeeCode.toLowerCase())
                    inserted++
                } catch (err: any) {
                    const reason = err?.code === "P2002" ? "Duplicate email or employee code" : "Database error"
                    rowErrors.push({ row: row.rowIndex + 1, email: row.email, reason })
                    skipped++
                }
            }
        }

        console.log(`[EMPLOYEES_IMPORT] org=${orgId} inserted=${inserted} skipped=${skipped} errors=${rowErrors.length}`)

        // Log hierarchy audit if provided
        if (Array.isArray(hierarchyAudit) && hierarchyAudit.length > 0 && inserted > 0) {
            try {
                await prisma.auditLog.create({
                    data: {
                        userId: ctx.userId,
                        action: "IMPORT_HIERARCHY",
                        entityType: "Employee",
                        changes: { hierarchyAudit, inserted, skipped, mode },
                        organizationId: orgId,
                    },
                })
            } catch (auditErr) {
                console.error("[EMPLOYEES_IMPORT] Audit log failed:", auditErr)
            }
        }

        // Fire-and-forget: reindex imported employees by looking up their IDs
        if (inserted > 0) {
            prisma.employee.findMany({
                where: { organizationId: ctx.organizationId, email: { in: credentials.map(c => c.email) } },
                select: { id: true },
            }).then(emps => {
                for (const e of emps) indexEmployee(e.id).catch(() => {})
            }).catch(() => {})
        }

        return apiSuccess({ inserted, skipped, errors: rowErrors, credentials }, { total: rows.length })
    } catch (error) {
        console.error("[EMPLOYEES_IMPORT]", error)
        return apiError("Import failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
