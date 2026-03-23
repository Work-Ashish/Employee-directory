/**
 * /api/employees/create — Creates both a Django User and Employee record.
 *
 * Django's Employee model has an optional `user` FK. For employees to log in,
 * they need a User account. This route:
 * 1. Creates a User via POST /api/v1/users/
 * 2. Creates an Employee via POST /api/v1/employees/ with the user FK
 * 3. Returns the employee data + generated temp password
 */
import { NextResponse } from "next/server"
import { salaryStore } from "@/lib/salary-store"

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

function generateTempPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let pw = ""
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length))
    return pw
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const base = getDjangoBase()
        const headers = forwardHeaders(req)

        const email = body.email
        const firstName = body.first_name || ""
        const lastName = body.last_name || ""

        if (!email) {
            return NextResponse.json(
                { error: { detail: "Email is required" } },
                { status: 400 }
            )
        }

        const tempPassword = generateTempPassword()

        // Step 1: Create Django User account
        let userId: string | null = null
        try {
            const userRes = await fetch(`${base}/api/v1/users/`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    email,
                    password: tempPassword,
                    first_name: firstName,
                    last_name: lastName,
                    is_tenant_admin: false,
                }),
                signal: AbortSignal.timeout(10_000),
            })
            if (userRes.ok) {
                const userJson = await userRes.json()
                const userData = userJson.data || userJson
                userId = (userData.id as string) || null
            }
            // If user creation fails (e.g. already exists), continue without user link
        } catch {
            // User creation network error — continue without user link
        }

        // Extract salary before sending to Django (no salary field on model)
        const salary = Number(body.salary) || 0

        // Step 2: Create Employee record, linked to User if created
        const employeePayload = { ...body }
        delete employeePayload.salary // Django doesn't have salary field
        if (userId) {
            employeePayload.user = userId
        }

        const empRes = await fetch(`${base}/api/v1/employees/`, {
            method: "POST",
            headers,
            body: JSON.stringify(employeePayload),
            signal: AbortSignal.timeout(10_000),
        })

        if (!empRes.ok) {
            const errJson = await empRes.json().catch(() => ({}))
            return NextResponse.json(
                { error: errJson.error || errJson },
                { status: empRes.status }
            )
        }

        const created = await empRes.json()
        const emp = created.data || created

        // Save salary to local store
        if (salary > 0 && emp.id) {
            salaryStore.set(emp.id as string, salary)
        }

        return NextResponse.json({
            data: {
                ...emp,
                salary,
                tempPassword,
                userCreated: !!userId,
            },
        })
    } catch {
        return NextResponse.json(
            { error: { detail: "Failed to create employee" } },
            { status: 500 }
        )
    }
}
