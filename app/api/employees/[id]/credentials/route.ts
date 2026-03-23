/**
 * /api/employees/[id]/credentials — Credential reset handler.
 *
 * Uses Django's admin password reset endpoint to set a new password.
 * If the employee has no linked user, creates one and links it.
 */
import { NextResponse } from "next/server"

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
    let password = ""
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const base = getDjangoBase()
    const headers = forwardHeaders(req)

    try {
        // Step 1: Fetch employee from Django
        const empRes = await fetch(`${base}/api/v1/employees/${id}/`, {
            headers,
            signal: AbortSignal.timeout(15_000),
        })

        if (!empRes.ok) {
            return NextResponse.json(
                { error: { detail: "Employee not found" } },
                { status: empRes.status }
            )
        }

        const empJson = await empRes.json()
        const employee = empJson.data || empJson
        const email = employee.email
        const firstName = employee.first_name || ""
        const lastName = employee.last_name || ""

        if (!email) {
            return NextResponse.json(
                { error: { detail: "Employee has no email address" } },
                { status: 400 }
            )
        }

        const tempPassword = generateTempPassword()
        const rawUser = employee.user
        let userId = typeof rawUser === "object" && rawUser !== null ? rawUser.id : rawUser

        // Step 2: If no linked user, find existing user by email
        if (!userId) {
            try {
                const searchRes = await fetch(`${base}/api/v1/users/`, {
                    headers,
                    signal: AbortSignal.timeout(15_000),
                })
                if (searchRes.ok) {
                    const searchJson = await searchRes.json()
                    const users = Array.isArray(searchJson) ? searchJson
                        : searchJson.data?.results || searchJson.results
                        || (Array.isArray(searchJson.data) ? searchJson.data : [])
                    const match = users.find((u: Record<string, unknown>) =>
                        (u.email as string)?.toLowerCase() === email.toLowerCase()
                    )
                    if (match?.id) userId = match.id as string
                }
            } catch { /* proceed to create */ }
        }

        // Step 3: If user exists, reset password via admin endpoint
        if (userId) {
            const resetRes = await fetch(`${base}/api/v1/users/${userId}/reset-password/`, {
                method: "POST",
                headers,
                body: JSON.stringify({ password: tempPassword }),
                signal: AbortSignal.timeout(15_000),
            })

            if (resetRes.ok) {
                // Ensure employee is linked to this user
                if (!rawUser) {
                    await fetch(`${base}/api/v1/employees/${id}/`, {
                        method: "PUT",
                        headers,
                        body: JSON.stringify({ user: userId }),
                        signal: AbortSignal.timeout(10_000),
                    }).catch(() => {})
                }

                return NextResponse.json({
                    data: { employeeId: id, email, tempPassword, userCreated: false },
                })
            }

            const resetErr = await resetRes.json().catch(() => ({}))
            console.error(`[creds] Password reset failed (${resetRes.status}):`, JSON.stringify(resetErr))
            return NextResponse.json(
                { error: { detail: resetErr.detail || "Failed to reset password" } },
                { status: resetRes.status }
            )
        }

        // Step 4: No user exists — create a new one
        const createRes = await fetch(`${base}/api/v1/users/`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                email,
                password: tempPassword,
                first_name: firstName,
                last_name: lastName,
                is_tenant_admin: false,
            }),
            signal: AbortSignal.timeout(15_000),
        })

        if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}))
            const detail = JSON.stringify(errJson)
            console.error(`[creds] CREATE user for ${email} failed:`, detail)
            return NextResponse.json(
                { error: { detail: `Failed to create user account. ${detail.includes("already exists") ? "A user with this email already exists." : "Please try again."}` } },
                { status: 500 }
            )
        }

        const createJson = await createRes.json()
        const userData = createJson.data || createJson
        const newUserId = (userData.id as string) || null

        // Link new user to employee
        if (newUserId) {
            await fetch(`${base}/api/v1/employees/${id}/`, {
                method: "PUT",
                headers,
                body: JSON.stringify({ user: newUserId }),
                signal: AbortSignal.timeout(10_000),
            }).catch(() => {})
        }

        return NextResponse.json({
            data: { employeeId: id, email, tempPassword, userCreated: true },
        })
    } catch (err) {
        console.error("Credentials route error:", err)
        return NextResponse.json(
            { error: { detail: "Failed to reach Django backend" } },
            { status: 502 }
        )
    }
}

export async function GET() {
    return NextResponse.json(
        { error: { detail: "Use POST to reset credentials" } },
        { status: 405 }
    )
}
