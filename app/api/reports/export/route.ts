import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { NextResponse } from "next/server"

// POST /api/reports/export
// Generates a CSV export for a given report configuration or saved report ID
export const POST = withAuth({ module: Module.REPORTS, action: Action.EXPORT }, async (req, ctx) => {
    try {
        const body = await req.json()
        const { reportId, format = "CSV" } = body

        let config: any
        let name = "Export"

        if (reportId) {
            const savedReport = await prisma.savedReport.findUnique({
                where: { id: reportId, organizationId: ctx.organizationId }
            })
            if (!savedReport) return apiError("Report not found", ApiErrorCode.NOT_FOUND, 404)
            config = savedReport.config
            name = savedReport.name
        } else {
            config = body.config
        }

        if (!config) return apiError("Report configuration is required", ApiErrorCode.VALIDATION_ERROR, 400)

        // Run the query (Simplified version of query/route.ts logic for MVP)
        // In a real app, we'd refactor the query logic into a shared service
        const data = await runReportQuery(config, ctx.organizationId)

        if (format === "CSV") {
            const csv = convertToCSV(data, config.columns)
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="${name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv"`
                }
            })
        }

        return apiError("Format not supported yet", ApiErrorCode.VALIDATION_ERROR, 400)

    } catch (error) {
        console.error("[REPORT_EXPORT_POST]", error)
        return apiError("Failed to generate export", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

async function runReportQuery(config: any, organizationId: string) {
    const { entityType, columns, filters } = config
    const where = { ...filters, organizationId, deletedAt: null }

    switch (entityType) {
        case "EMPLOYEE":
            return await prisma.employee.findMany({ where })
        case "PAYROLL":
            return await prisma.payroll.findMany({ where, include: { employee: true } })
        case "ATTENDANCE":
            return await prisma.attendance.findMany({ where, include: { employee: true } })
        default:
            return []
    }
}

// Sanitize CSV values to prevent formula injection (=, +, -, @, \t, \r)
function sanitizeCsvValue(val: string): string {
    if (/^[=+\-@\t\r]/.test(val)) {
        return "'" + val
    }
    return val
}

function csvQuote(val: string): string {
    const sanitized = sanitizeCsvValue(val)
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
        return `"${sanitized.replace(/"/g, '""')}"`
    }
    return sanitized
}

function convertToCSV(data: any[], columns: string[]) {
    if (!data || data.length === 0) return ""

    // Header
    const header = columns.map(c => csvQuote(c)).join(",") + "\n"

    // Rows
    const rows = data.map(item => {
        return columns.map(col => {
            let val = item
            if (col.includes(".")) {
                const parts = col.split(".")
                parts.forEach(p => val = val?.[p])
            } else {
                val = item[col]
            }

            // Format value for CSV
            if (val === null || val === undefined) return ""
            if (val instanceof Date) return val.toISOString()
            if (typeof val === "string") return csvQuote(val)
            return String(val)
        }).join(",")
    }).join("\n")

    return header + rows
}
