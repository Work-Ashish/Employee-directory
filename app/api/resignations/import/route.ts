import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/resignations/import
export async function POST(req: Request) {
    try {
        const { rows } = await req.json()
        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided" }, { status: 400 })
        }

        let inserted = 0
        let skipped = 0

        for (const row of rows) {
            try {
                const employeeCode = String(row["employeeCode"] || row["Employee Code"] || "").trim()
                const employee = await prisma.employee.findFirst({
                    where: employeeCode
                        ? { employeeCode }
                        : { firstName: { contains: String(row["firstName"] || row["First Name"] || ""), mode: "insensitive" } }
                })
                if (!employee) { skipped++; continue }

                const reason = String(row["reason"] || row["Reason"] || "").trim()
                const lastDayRaw = String(row["lastDay"] || row["Last Day"] || "").trim()
                const lastDay = lastDayRaw ? new Date(lastDayRaw) : null
                if (!lastDay || isNaN(lastDay.getTime())) { skipped++; continue }

                const statusRaw = String(row["status"] || row["Status"] || "UNDER_REVIEW").trim().toUpperCase()
                const validStatuses = ["UNDER_REVIEW", "NOTICE_PERIOD", "PROCESSED"]
                const status = validStatuses.includes(statusRaw) ? statusRaw as any : "UNDER_REVIEW"

                await prisma.resignation.create({
                    data: { employeeId: employee.id, organizationId: employee.organizationId, reason, lastDay, status }
                })
                inserted++
            } catch { skipped++ }
        }

        return NextResponse.json({ inserted, skipped })
    } catch (error) {
        console.error("[RESIGNATION_IMPORT]", error)
        return NextResponse.json({ error: "Import failed" }, { status: 500 })
    }
}
