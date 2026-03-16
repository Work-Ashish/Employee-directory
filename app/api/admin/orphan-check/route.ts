import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

// GET /api/admin/orphan-check — detect employees without managers and create alerts
export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (_req, ctx) => {
    try {
        // Find all active non-CEO employees without a manager
        const orphans = await prisma.employee.findMany({
            where: {
                ...orgFilter(ctx),
                status: "ACTIVE",
                deletedAt: null,
                managerId: null,
                user: { role: { not: "CEO" } },
            },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
        })

        if (orphans.length === 0) {
            return apiSuccess({ orphanCount: 0, alertsCreated: 0, orphans: [] })
        }

        // Check for existing unresolved alerts to avoid duplicates
        const existingAlerts = await prisma.adminAlerts.findMany({
            where: {
                organizationId: ctx.organizationId,
                resolved: false,
                reason: { startsWith: "Employee has no assigned manager" },
                employeeId: { in: orphans.map((o) => o.id) },
            },
            select: { employeeId: true },
        })
        const alreadyAlerted = new Set(existingAlerts.map((a) => a.employeeId))

        const newOrphans = orphans.filter((o) => !alreadyAlerted.has(o.id))

        // Create alerts for newly detected orphans
        if (newOrphans.length > 0) {
            await prisma.$transaction(
                newOrphans.map((o) =>
                    prisma.adminAlerts.create({
                        data: {
                            employeeId: o.id,
                            severity: "MEDIUM",
                            reason: `Employee has no assigned manager: ${o.firstName} ${o.lastName} (${o.employeeCode})`,
                            organizationId: ctx.organizationId,
                        },
                    })
                )
            )
        }

        return apiSuccess({
            orphanCount: orphans.length,
            alertsCreated: newOrphans.length,
            orphans: orphans.map((o) => ({
                id: o.id,
                name: `${o.firstName} ${o.lastName}`,
                employeeCode: o.employeeCode,
            })),
        })
    } catch (error) {
        console.error("[ORPHAN_CHECK]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
