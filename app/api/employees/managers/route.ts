/**
 * /api/employees/managers — Local handler.
 *
 * Django has no dedicated /employees/managers/ endpoint.
 * This route queries Django's employee list and returns employees
 * who could serve as managers (all active employees with a designation).
 */
import { NextResponse } from "next/server"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

function getDjangoBase(): string {
    return (
        process.env.DJANGO_GATEWAY_URL ||
        process.env.DJANGO_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://127.0.0.1:8000"
    )
}

function forwardHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = req.headers.get("authorization")
    if (auth) headers["Authorization"] = auth
    const slug = req.headers.get("x-tenant-slug") || req.headers.get("X-Tenant-Slug")
    if (slug) headers["X-Tenant-Slug"] = slug
    return headers
}

async function handleGET(req: Request) {
    try {
        const res = await fetch(`${getDjangoBase()}/api/v1/employees/?per_page=1000`, {
            headers: forwardHeaders(req),
            signal: AbortSignal.timeout(10_000),
        })

        if (!res.ok) {
            return NextResponse.json(
                { error: { detail: "Failed to fetch employees from Django" } },
                { status: res.status }
            )
        }

        const json = await res.json()
        // Django returns a flat array from EmployeeListCreateView
        const employees: Record<string, unknown>[] = json.data?.results || json.results || (Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [])

        // Return all active employees as potential managers
        const managers = employees
            .filter((e: Record<string, unknown>) => {
                const status = (e.status as string || "").toLowerCase()
                return status === "active" || status === "pre_joining"
            })
            .map((e: Record<string, unknown>) => ({
                id: e.id,
                employeeCode: e.employee_code,
                firstName: e.first_name,
                lastName: e.last_name,
                email: e.email,
                designation: e.designation || "",
                department: e.department ? { name: e.department } : undefined,
            }))

        return NextResponse.json({ data: managers })
    } catch {
        return NextResponse.json(
            { error: { detail: "Failed to reach Django backend" } },
            { status: 502 }
        )
    }
}

export const GET = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handleGET)
