import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action, hasPermission } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { NextResponse } from "next/server"

/**
 * POST /api/reports/query
 * Dynamically queries the database based on a report configuration.
 */
export const POST = withAuth({ module: Module.REPORTS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { entityType, columns, filters, sortBy, sortOrder = "desc", limit = 100 } = body

        if (!entityType) {
            return apiError("entityType is required", ApiErrorCode.VALIDATION_ERROR, 400)
        }

        let result: any[] = []
        let total = 0

        const where: any = { organizationId: ctx.organizationId }

        // Apply dynamic filters
        if (filters && typeof filters === "object") {
            Object.keys(filters).forEach(key => {
                const value = filters[key]
                if (value !== undefined && value !== null && value !== "") {
                    // Simple equality for now, can be expanded to range/contains
                    if (typeof value === "string" && (value.includes("-") || !isNaN(Date.parse(value)))) {
                        // Potential date range or date
                        // Placeholder for more complex filter logic
                        where[key] = value
                    } else {
                        where[key] = value
                    }
                }
            })
        }

        // Entity-specific query logic & Permission check
        switch (entityType) {
            case "EMPLOYEE":
                // All authorized roles can query basic employee data
                [result, total] = await Promise.all([
                    prisma.employee.findMany({
                        where,
                        select: buildSelect(columns),
                        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
                        take: limit
                    }),
                    prisma.employee.count({ where })
                ])
                break

            case "PAYROLL":
                // Strict check for Payroll
                if (!hasPermission(ctx.role, Module.PAYROLL, Action.VIEW)) {
                    return apiError("Insufficient permissions for Payroll reports", ApiErrorCode.FORBIDDEN, 403)
                }
                [result, total] = await Promise.all([
                    prisma.payroll.findMany({
                        where,
                        select: buildSelect(columns, ["employee"]),
                        orderBy: sortBy ? { [sortBy]: sortOrder } : { month: "desc" },
                        take: limit
                    }),
                    prisma.payroll.count({ where })
                ])
                break

            case "ATTENDANCE":
                // HR and Admins can see attendance
                if (!hasPermission(ctx.role, Module.ATTENDANCE, Action.VIEW)) {
                    return apiError("Insufficient permissions for Attendance reports", ApiErrorCode.FORBIDDEN, 403)
                }
                [result, total] = await Promise.all([
                    prisma.attendance.findMany({
                        where,
                        select: buildSelect(columns, ["employee"]),
                        orderBy: sortBy ? { [sortBy]: sortOrder } : { date: "desc" },
                        take: limit
                    }),
                    prisma.attendance.count({ where })
                ])
                break

            default:
                return apiError(`Unsupported entity type: ${entityType}`, ApiErrorCode.VALIDATION_ERROR, 400)
        }

        return apiSuccess({
            data: result,
            meta: {
                total,
                count: result.length,
                entityType
            }
        })

    } catch (error) {
        console.error("[REPORT_QUERY_POST]", error)
        return apiError("Failed to execute report query", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

/**
 * Builds a Prisma select object from an array of column names.
 * Supports basic relation nesting for "employee".
 */
function buildSelect(columns: string[], includes: string[] = []) {
    if (!columns || columns.length === 0) return undefined

    const select: any = {}
    columns.forEach(col => {
        if (col.includes(".")) {
            const [rel, field] = col.split(".")
            if (!select[rel]) select[rel] = { select: {} }
            select[rel].select[field] = true
        } else {
            select[col] = true
        }
    })

    // Ensure organizationId is not leaked unless requested (usually not needed)
    // Add relation includes if needed for joins
    includes.forEach(rel => {
        if (!select[rel]) {
            // Default select for relations if not specified in columns
            if (rel === "employee") {
                select[rel] = {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { name: true } }
                    }
                }
            }
        }
    })

    return select
}
