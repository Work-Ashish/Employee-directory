import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// POST /api/admin/assets/import (Admin only, scoped)
export const POST = withAuth({ module: Module.ASSETS, action: Action.IMPORT }, async (req, ctx) => {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return apiError("No rows provided", ApiErrorCode.BAD_REQUEST, 400)
        }

        let inserted = 0
        let skipped = 0

        for (const row of rows) {
            try {
                const name = String(row["name"] || row["Asset Name"] || "").trim()
                const serialNumber = String(row["serialNumber"] || row["Serial Number"] || "").trim()
                if (!name || !serialNumber) { skipped++; continue }

                const typeRaw = String(row["type"] || row["Type"] || "HARDWARE").trim().toUpperCase()
                const validTypes = ["HARDWARE", "SOFTWARE", "ACCESSORY"]
                const type = validTypes.includes(typeRaw) ? typeRaw as any : "HARDWARE"

                const statusRaw = String(row["status"] || row["Status"] || "AVAILABLE").trim().toUpperCase()
                const validStatuses = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]
                const status = validStatuses.includes(statusRaw) ? statusRaw as any : "AVAILABLE"

                const purchaseDateRaw = String(row["purchaseDate"] || row["Purchase Date"] || "").trim()
                const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw) : new Date()
                const value = parseFloat(String(row["value"] || row["Value"] || 0))

                // Optional: assign to employee (MUST be in the same organization)
                const employeeCode = String(row["assignedToCode"] || row["Assigned To Code"] || "").trim()
                let assignedToId: string | null = null
                if (employeeCode) {
                    const emp = await prisma.employee.findFirst({
                        where: { employeeCode, organizationId: ctx.organizationId },
                        select: { id: true }
                    })
                    if (emp) assignedToId = emp.id
                }

                await prisma.asset.create({
                    data: {
                        name,
                        serialNumber,
                        type,
                        status,
                        purchaseDate,
                        value,
                        assignedToId,
                        organizationId: ctx.organizationId,
                    }
                })
                inserted++
            } catch { skipped++ }
        }

        return apiSuccess({ inserted, skipped })
    } catch (error) {
        console.error("[ASSETS_IMPORT]", error)
        return apiError("Import failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
