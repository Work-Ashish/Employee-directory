/**
 * /api/employees/salaries — File-backed salary store.
 *
 * Django's Employee model has no salary field. This route manages salary
 * data via a JSON file that persists across server restarts.
 *
 * GET  → { data: Record<employeeId, number> }
 * POST → { employeeId, salary } or { entries: [{ employeeId, salary }] }
 */
import { NextResponse } from "next/server"
import { salaryStore } from "@/lib/salary-store"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

async function handleGET() {
    return NextResponse.json({ data: salaryStore.getAll() })
}

async function handlePOST(req: Request) {
    try {
        const body = await req.json()

        // Batch mode: { entries: [{ employeeId, salary }] }
        if (Array.isArray(body.entries)) {
            const valid = body.entries.filter(
                (e: { employeeId?: string; salary?: number }) => e.employeeId && e.salary != null
            )
            salaryStore.setBatch(
                valid.map((e: { employeeId: string; salary: number }) => ({
                    employeeId: String(e.employeeId),
                    salary: Number(e.salary) || 0,
                }))
            )
            return NextResponse.json({ data: { updated: valid.length } })
        }

        // Single mode: { employeeId, salary }
        if (body.employeeId && body.salary != null) {
            salaryStore.set(String(body.employeeId), Number(body.salary) || 0)
            return NextResponse.json({ data: { employeeId: body.employeeId, salary: Number(body.salary) } })
        }

        return NextResponse.json(
            { error: { detail: "employeeId and salary are required" } },
            { status: 400 }
        )
    } catch {
        return NextResponse.json(
            { error: { detail: "Invalid request body" } },
            { status: 400 }
        )
    }
}

export const GET = withAuth({ module: Module.PAYROLL, action: Action.VIEW }, handleGET)
export const POST = withAuth({ module: Module.PAYROLL, action: Action.CREATE }, handlePOST)
